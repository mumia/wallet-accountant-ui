import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { createApi } from "../../api/client";
import { http } from "../../mocks/http";
import { mockDb, server } from "../../test/server";
import { homeDestination } from "./home-destination";

const household = (household_id: string) => ({ household_id, name: "Home", base_currency: "EUR" });

function destination(lastHousehold?: string) {
  const { api } = createApi({ baseUrl: "/api" });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return homeDestination({ api, queryClient }, lastHousehold);
}

describe("homeDestination", () => {
  it("sends someone who hasn't redeemed an Invitation to /register", async () => {
    mockDb.reset("new-user");

    await expect(destination()).resolves.toEqual({ to: "/register" });
  });

  it("sends a User without a Household to /households/new", async () => {
    mockDb.reset("registered");

    await expect(destination()).resolves.toEqual({ to: "/households/new" });
  });

  it("goes back to the Household last opened, else the first", async () => {
    mockDb.write({
      registered: true,
      households: [household("h-1"), household("h-2")],
      accounts: {},
    });

    await expect(destination("h-2")).resolves.toMatchObject({ params: { householdId: "h-2" } });
    await expect(destination("gone")).resolves.toMatchObject({ params: { householdId: "h-1" } });
    await expect(destination()).resolves.toEqual({
      to: "/households/$householdId",
      params: { householdId: "h-1" },
    });
  });

  it("throws any other failure for the error screen", async () => {
    server.use(
      http.get("/households", ({ response }) =>
        response(403).json({ type: "about:blank", title: "Forbidden", status: 403 }),
      ),
    );

    await expect(destination()).rejects.toMatchObject({ status: 403 });
  });
});
