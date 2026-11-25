import { QueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { components } from "../../api/schema.gen";
import { defaultNS, resources } from "../../app/i18n";
import { notificationsKey, pollNotificationsSoon } from "../../lib/notifications";
import { extensibleEnum } from "../../test/contract";
import { memberNotificationText, notificationKinds } from "./notifications-bell";

type Notification = components["schemas"]["Notification"];

describe("Notifications", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("knows every kind the contract lists", () => {
    expect([...notificationKinds].sort()).toEqual(extensibleEnum("Notification").sort());
  });

  it("are reread about 3 s and 10 s after a Statement import", () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    pollNotificationsSoon(queryClient, "home");
    vi.advanceTimersByTime(2_999);
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(7_000);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenLastCalledWith({ queryKey: notificationsKey("home") });
  });
});

describe("a member Notification", () => {
  const i18n = i18next.createInstance();
  beforeAll(async () => {
    await i18n.init({ lng: "en", defaultNS, resources, interpolation: { escapeValue: false } });
  });

  const me = "0190f5f2-7c00-7000-8000-0000000000aa";
  const ana = { user_id: "0190f5f2-7c00-7000-8000-0000000000c1", display_name: "Ana" };
  const rui = { user_id: "0190f5f2-7c00-7000-8000-0000000000c2", display_name: "Rui" };
  const unnamed = { user_id: "0190f5f2-7c00-7000-8000-0000000000c3" };
  const you = { user_id: me, display_name: "Sam" };

  const textFor = (myUserId: string | undefined, fields: Partial<Notification>) =>
    memberNotificationText(
      {
        notification_id: "0190f5f2-7c00-7000-8000-000000000611",
        kind: "MEMBER_JOINED",
        created_at: "2026-11-24T10:00:00Z",
        read: false,
        ...fields,
      },
      myUserId,
      i18n.getFixedT("en", "shell"),
    );
  const text = (fields: Partial<Notification>) => textFor(me, fields);

  it("says who joined, who left, and who removed whom", () => {
    expect(text({ kind: "MEMBER_JOINED", member: ana })).toBe("Ana joined the Household");
    expect(text({ kind: "MEMBER_LEFT", member: ana })).toBe("Ana left the Household");
    expect(text({ kind: "MEMBER_REMOVED", member: ana, removed_by: rui })).toBe("Rui removed Ana");
  });

  it('reads "You" for the caller, as the member and as the remover', () => {
    expect(text({ kind: "MEMBER_JOINED", member: you })).toBe("You joined the Household");
    expect(text({ kind: "MEMBER_LEFT", member: you })).toBe("You left the Household");
    expect(text({ kind: "MEMBER_REMOVED", member: you, removed_by: rui })).toBe("Rui removed you");
    expect(text({ kind: "MEMBER_REMOVED", member: ana, removed_by: you })).toBe("You removed Ana");
  });

  it("uses the caller's name while GET /me hasn't answered", () => {
    expect(textFor(undefined, { kind: "MEMBER_JOINED", member: you })).toBe(
      "Sam joined the Household",
    );
  });

  it('reads "A member" for a User without a display name', () => {
    expect(text({ kind: "MEMBER_JOINED", member: unnamed })).toBe("A member joined the Household");
    expect(text({ kind: "MEMBER_LEFT", member: unnamed })).toBe("A member left the Household");
    expect(text({ kind: "MEMBER_REMOVED", member: unnamed, removed_by: rui })).toBe(
      "Rui removed a member",
    );
    expect(text({ kind: "MEMBER_REMOVED", member: ana, removed_by: unnamed })).toBe(
      "A member removed Ana",
    );
    expect(text({ kind: "MEMBER_REMOVED", member: ana })).toBe("A member removed Ana");
  });

  it("is shown as sent without a member, like a kind this build doesn't know", () => {
    expect(text({ kind: "MEMBER_JOINED" })).toBeUndefined();
    expect(text({ kind: "MEMBER_LEFT" })).toBeUndefined();
    expect(text({ kind: "MEMBER_REMOVED", removed_by: rui })).toBeUndefined();
    expect(text({ kind: "SUSPECTED_DUPLICATES_FOUND", member: ana })).toBeUndefined();
    expect(text({ kind: "MEMBER_PROMOTED", member: ana })).toBeUndefined();
  });
});
