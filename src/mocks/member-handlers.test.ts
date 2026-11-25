// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { components } from "../api/schema.gen";
import { mockDb } from "../test/server";
import { invitingHousehold, mockUserId, seededHousehold, withMember } from "./db";

const api = "http://localhost/api";

type MemberList = components["schemas"]["MemberList"];
type Household = components["schemas"]["Household"];

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

async function listMembers(householdId: string) {
  const { status, body } = await call("GET", `/households/${householdId}/members`);
  return { status, body: body as MemberList };
}

describe("GET …/members", () => {
  it("lists the mock User, who created Home, by their display name as it is now", async () => {
    expect((await listMembers(seededHousehold.household_id)).body).toEqual({
      items: [{ user_id: mockUserId, display_name: "Sam", joined_at: "2026-01-01T09:00:00Z" }],
    });

    await call("PATCH", "/me", { display_name: "Samantha" });
    expect((await listMembers(seededHousehold.household_id)).body).toMatchObject({
      items: [{ user_id: mockUserId, display_name: "Samantha" }],
    });
  });

  it("adds seeded members after the mock User, a nameless one without display_name", async () => {
    mockDb.write(withMember(withMember(mockDb.read(), "Ana"), ""));

    const { body } = await listMembers(seededHousehold.household_id);
    expect(body.items.map(({ display_name }) => display_name)).toEqual(["Sam", "Ana", undefined]);
    expect(body.items[1]?.joined_at).toBe("2026-03-11T18:30:00Z");
    expect(body.items[2]).not.toHaveProperty("display_name");
  });

  it("makes the mock User the newest member of a Household they join or create", async () => {
    await call("POST", "/memberships", { invitation_code: "JOIN-BEACH-2026" });
    const joined = await listMembers(invitingHousehold.household_id);
    expect(joined.body).toMatchObject({
      items: [{ display_name: "Rui" }, { user_id: mockUserId, display_name: "Sam" }],
    });

    const created = await call("POST", "/households", { name: "Flat", base_currency: "EUR" });
    expect((await listMembers((created.body as Household).household_id)).body).toMatchObject({
      items: [{ user_id: mockUserId }],
    });
  });

  it("answers 404 for a Household the caller isn't a member of", async () => {
    expect((await listMembers(invitingHousehold.household_id)).status).toBe(404);
  });
});
