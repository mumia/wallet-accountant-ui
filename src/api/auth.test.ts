import { HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { http } from "../mocks/http";
import { server } from "../test/server";
import type { ApiAuth } from "./auth";
import { createApi } from "./client";

const unauthorized = () =>
  HttpResponse.json(
    { type: "about:blank", title: "Unauthorized", status: 401 },
    { status: 401, headers: { "Content-Type": "application/problem+json" } },
  );

/** A fake session: `tokens` are what renewals hand out, in order. */
function fakeAuth(current: string | undefined, tokens: (string | undefined)[] = []) {
  let token = current;
  const auth = {
    accessToken: vi.fn(() => Promise.resolve(token)),
    renew: vi.fn(() => {
      token = tokens.shift();
      return Promise.resolve(token);
    }),
    sessionEnded: vi.fn(),
  } satisfies ApiAuth;
  return auth;
}

/** Answers /currencies with 200 only for `Bearer <accepted>`, recording what was sent. */
function serveCurrencies(accepted: string | undefined) {
  const seen: (string | null)[] = [];
  server.use(
    http.get("/currencies", ({ request, response }) => {
      const header = request.headers.get("Authorization");
      seen.push(header);
      return header === `Bearer ${String(accepted)}`
        ? response(200).json({ items: [{ code: "EUR", decimal_places: 2 }] })
        : response.untyped(unauthorized());
    }),
  );
  return seen;
}

describe("the bearer token", () => {
  it("goes on every request", async () => {
    const seen = serveCurrencies("t1");
    const { fetchClient } = createApi({ baseUrl: "/api", auth: fakeAuth("t1") });

    const { data } = await fetchClient.GET("/currencies");

    expect(seen).toEqual(["Bearer t1"]);
    expect(data?.items).toHaveLength(1);
  });

  it("is renewed once after a 401, and the request sent again", async () => {
    const seen = serveCurrencies("t2");
    const auth = fakeAuth("t1", ["t2"]);
    const { fetchClient } = createApi({ baseUrl: "/api", auth });

    const { data } = await fetchClient.GET("/currencies");

    expect(seen).toEqual(["Bearer t1", "Bearer t2"]);
    expect(data?.items).toHaveLength(1);
    expect(auth.sessionEnded).not.toHaveBeenCalled();
  });

  it("ends the session when it can't be renewed", async () => {
    serveCurrencies("never");
    const auth = fakeAuth("t1", [undefined]);
    const { fetchClient } = createApi({ baseUrl: "/api", auth });

    const { error } = await fetchClient.GET("/currencies");

    expect(error).toMatchObject({ status: 401 });
    expect(auth.sessionEnded).toHaveBeenCalledOnce();
  });

  it("ends the session when the renewed token is refused too", async () => {
    const seen = serveCurrencies("never");
    const auth = fakeAuth("t1", ["t2"]);
    const { fetchClient } = createApi({ baseUrl: "/api", auth });

    const { error } = await fetchClient.GET("/currencies");

    expect(seen).toHaveLength(2);
    expect(error).toMatchObject({ status: 401 });
    expect(auth.sessionEnded).toHaveBeenCalledOnce();
  });

  it("is renewed only once when several requests get a 401 together", async () => {
    serveCurrencies("t2");
    const auth = fakeAuth("t1", ["t2", "t3"]);
    const { fetchClient } = createApi({ baseUrl: "/api", auth });

    const results = await Promise.all([
      fetchClient.GET("/currencies"),
      fetchClient.GET("/currencies"),
    ]);

    expect(auth.renew).toHaveBeenCalledOnce();
    expect(results.map((result) => result.data?.items.length)).toEqual([1, 1]);
  });

  it("resends a write with its body and its Idempotency-Key", async () => {
    const sent: { auth: string | null; key: string | null; body: string }[] = [];
    server.use(
      http.post("/registrations", async ({ request, response }) => {
        sent.push({
          auth: request.headers.get("Authorization"),
          key: request.headers.get("Idempotency-Key"),
          body: await (request as Request).text(),
        });
        return request.headers.get("Authorization") === "Bearer t2"
          ? response.untyped(new HttpResponse(null, { status: 201 }))
          : response.untyped(unauthorized());
      }),
    );
    const { fetchClient } = createApi({ baseUrl: "/api", auth: fakeAuth("t1", ["t2"]) });

    await fetchClient.POST("/registrations", {
      body: { invitation_code: "ABCD-1234", display_name: "Sam" },
    });

    expect(sent).toHaveLength(2);
    expect(sent[1]?.auth).toBe("Bearer t2");
    expect(sent[1]?.key).toBe(sent[0]?.key);
    expect(sent[1]?.body).toBe(sent[0]?.body);
  });
});
