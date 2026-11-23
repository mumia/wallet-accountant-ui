import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { notificationsKey, pollNotificationsSoon } from "../../lib/notifications";
import { extensibleEnum } from "../../test/contract";
import { notificationKinds } from "./notifications-bell";

describe("Notifications", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("knows every kind the contract lists, but the member ones", () => {
    // The joining spec will give the member kinds their copy; until then they
    // are shown as sent, like any kind this build doesn't know.
    const awaitingCopy = ["MEMBER_JOINED", "MEMBER_LEFT", "MEMBER_REMOVED"];
    expect([...notificationKinds, ...awaitingCopy].sort()).toEqual(
      extensibleEnum("Notification").sort(),
    );
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
