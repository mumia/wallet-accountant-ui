// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { components } from "../api/schema.gen";
import { mockDb } from "../test/server";
import { invitingHousehold, mockUserId, seededHousehold, withInvitation, withMember } from "./db";

const api = "http://localhost/api";
const home = seededHousehold.household_id;

type IssuedInvitation = components["schemas"]["IssuedInvitation"];
type InvitationList = components["schemas"]["InvitationList"];

async function call(method: string, path: string, options: { body?: unknown; key?: string } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": options.key ?? crypto.randomUUID(),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  return { status: response.status, body: (text === "" ? undefined : JSON.parse(text)) as unknown };
}

async function issue(key?: string) {
  const { status, body } = await call(
    "POST",
    `/households/${home}/invitations`,
    key === undefined ? {} : { key },
  );
  return { status, body: body as IssuedInvitation };
}

async function list(householdId = home) {
  const { status, body } = await call("GET", `/households/${householdId}/invitations`);
  return { status, body: body as InvitationList };
}

describe("the mock's Invitations", () => {
  it("issues one with a random code that expires 24 hours later, listed without its code", async () => {
    const before = Date.now();
    const { status, body } = await issue();

    expect(status).toBe(201);
    expect(body.code).toMatch(/^[\w-]{40,}$/);
    const expires = new Date(body.expires_at).getTime();
    expect(expires - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(expires - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);

    const listed = await list();
    expect(listed.body.items).toEqual([
      {
        invitation_id: body.invitation_id,
        issued_by: { user_id: mockUserId, display_name: "Sam" },
        issued_at: expect.any(String) as string,
        expires_at: body.expires_at,
      },
    ]);
    expect(JSON.stringify(listed.body)).not.toContain(body.code);
  });

  it("gives a replay with the same Idempotency-Key the same code, and another key a new one", async () => {
    const first = await issue("key-1");
    const replay = await issue("key-1");
    const other = await issue("key-2");

    expect(replay.body).toEqual(first.body);
    expect(other.body.code).not.toBe(first.body.code);
    expect((await list()).body.items).toHaveLength(2);
  });

  it("names the issuer as they are named now, and lists seeded ones oldest first", async () => {
    mockDb.write(withInvitation(withMember(withMember(mockDb.read(), "Ana"), ""), "Ana"));
    mockDb.write(withInvitation(mockDb.read(), ""));

    const { body } = await list();
    expect(body.items.map(({ issued_by }) => issued_by.display_name)).toEqual(["Ana", undefined]);
    expect(body.items[1]?.issued_by).not.toHaveProperty("display_name");
  });

  it("revokes an open one, and answers 404 for one that isn't open", async () => {
    const { body } = await issue();
    const path = `/households/${home}/invitations/${body.invitation_id}`;

    expect((await call("DELETE", path)).status).toBe(204);
    expect((await list()).body.items).toEqual([]);
    expect((await call("DELETE", path)).status).toBe(404);
    expect(
      (await call("DELETE", `/households/${home}/invitations/${crypto.randomUUID()}`)).status,
    ).toBe(404);
  });

  it("drops an expired one from the list, and won't revoke it", async () => {
    const { body } = await issue();
    const state = mockDb.read();
    mockDb.write({
      ...state,
      invitations: {
        [home]: (state.invitations?.[home] ?? []).map((invitation) => ({
          ...invitation,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        })),
      },
    });

    expect((await list()).body.items).toEqual([]);
    expect(
      (await call("DELETE", `/households/${home}/invitations/${body.invitation_id}`)).status,
    ).toBe(404);
  });

  it("marks one redeemed when its code is used to join: it leaves the list and works once", async () => {
    const { body } = await issue();
    // The mock User left Home, so its code lets them back in.
    const state = mockDb.read();
    mockDb.write({
      ...state,
      households: state.households.filter(({ household_id }) => household_id !== home),
    });

    const joined = await call("POST", "/memberships", { body: { invitation_code: body.code } });
    expect(joined).toEqual({ status: 201, body: seededHousehold });
    expect((await list()).body.items).toEqual([]);

    mockDb.write({
      ...mockDb.read(),
      households: mockDb.read().households.filter(({ household_id }) => household_id !== home),
    });
    const again = await call("POST", "/memberships", { body: { invitation_code: body.code } });
    expect(again.status).toBe(422);
  });

  it("answers 404 for a Household the caller isn't a member of", async () => {
    const householdId = invitingHousehold.household_id;
    expect((await list(householdId)).status).toBe(404);
    expect((await call("POST", `/households/${householdId}/invitations`)).status).toBe(404);
  });
});
