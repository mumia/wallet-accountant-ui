import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { http, withExactAmounts } from "../mocks/http";
import { server } from "../test/server";
import { createApi } from "./client";

const { fetchClient } = createApi({ baseUrl: "/api" });

const householdId = "0193a0b0-0000-7000-8000-000000000001";
const accountId = "0193a0b0-0000-7000-8000-000000000002";
const accountPath = "/households/{household_id}/accounts/{account_id}" as const;
const closePath =
  "/households/{household_id}/accounts/{account_id}/months/{booking_month}/close" as const;
const closeParams = {
  path: { household_id: householdId, account_id: accountId, booking_month: "2026-01" },
};

describe("the API client", () => {
  it("receives amounts exactly", async () => {
    server.use(
      http.get(accountPath, async ({ response }) =>
        response.untyped(
          await withExactAmounts(
            response(200).json({
              account_id: accountId,
              name: "Wallet",
              kind: "CRYPTO_WALLET",
              currency: "ETH",
              start_date: "2026-01-01",
              awaiting_first_statement_import: false,
              balance: { amount: "1.000000000000000001", currency: "ETH" },
              open_month: "2026-01",
              pending: 0,
              suspected_duplicates: 0,
            }),
          ),
        ),
      ),
    );

    const { data } = await fetchClient.GET(accountPath, {
      params: { path: { household_id: householdId, account_id: accountId } },
    });

    expect(data?.balance).toEqual({ amount: "1.000000000000000001", currency: "ETH" });
  });

  it("sends amounts as exact JSON numbers", async () => {
    let sent = "";
    server.use(
      http.post(closePath, async ({ request }) => {
        // openapi-msw types a JSON body as JSON only; the raw text is the point here.
        sent = await (request as Request).text();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await fetchClient.POST(closePath, {
      params: closeParams,
      body: { statement_balance: { amount: "100.00", currency: "EUR" } },
    });

    expect(sent).toBe('{"statement_balance":{"amount":100.00,"currency":"EUR"}}');
  });

  it("gives an error without a problem body a problem with its status", async () => {
    server.use(http.untyped.get("*/api/currencies", () => new HttpResponse(null, { status: 503 })));

    const { error } = await fetchClient.GET("/currencies");

    expect(error).toMatchObject({ type: "about:blank", status: 503 });
  });

  it("passes the backend's problem through", async () => {
    server.use(
      http.get("/currencies", ({ response }) =>
        response(401).json({ type: "about:blank", title: "Unauthorized", status: 401 }),
      ),
    );

    const { error } = await fetchClient.GET("/currencies");

    expect(error).toEqual({ type: "about:blank", title: "Unauthorized", status: 401 });
  });
});

describe("Idempotency-Key", () => {
  function recordKeys(statuses: number[]) {
    const keys: (string | null)[] = [];
    server.use(
      http.post(closePath, ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"));
        return new HttpResponse(null, { status: statuses[keys.length - 1] ?? 204 });
      }),
    );
    return keys;
  }

  const close = (amount: `${number}`) =>
    fetchClient.POST(closePath, {
      params: closeParams,
      body: { statement_balance: { amount, currency: "EUR" } },
    });

  it("reuses the key when the same request is sent again after an error", async () => {
    const keys = recordKeys([503, 204]);

    await close("10.00");
    await close("10.00");

    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
  });

  it("makes a new key when the input changed after an error", async () => {
    const keys = recordKeys([422, 204]);

    await close("10.00");
    await close("11.00");

    expect(keys[1]).not.toBe(keys[0]);
  });

  it("makes a new key after a success, even for the same input", async () => {
    const keys = recordKeys([204, 204]);

    await close("12.00");
    await close("12.00");

    expect(keys[1]).not.toBe(keys[0]);
  });

  it("sends no key on a read", async () => {
    let key: string | null = "unset";
    server.use(
      http.get("/currencies", ({ request, response }) => {
        key = request.headers.get("Idempotency-Key");
        return response(200).json({ items: [] });
      }),
    );

    await fetchClient.GET("/currencies");

    expect(key).toBeNull();
  });
});
