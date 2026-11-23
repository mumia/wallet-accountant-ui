import { describe, expect, it } from "vitest";

import {
  addMonths,
  closesFrom,
  formatMonth,
  hasEnded,
  isMonth,
  monthOf,
  nearestOffered,
} from "./month";

describe("Booking months", () => {
  it("are read from dates", () => {
    expect(monthOf("2026-03-09")).toBe("2026-03");
    expect(monthOf(new Date(2026, 11, 31))).toBe("2026-12");
  });

  it("step across years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("step to the nearest offered month, across gaps", () => {
    const offered = ["2026-11", "2026-08", "2026-07"] as const;
    expect(nearestOffered(offered, "2026-08", "earlier")).toBe("2026-07");
    expect(nearestOffered(offered, "2026-08", "later")).toBe("2026-11");
    expect(nearestOffered(offered, "2026-10", "earlier")).toBe("2026-08");
    expect(nearestOffered(offered, "2026-10", "later")).toBe("2026-11");
    expect(nearestOffered(offered, "2026-07", "earlier")).toBeUndefined();
    expect(nearestOffered(offered, "2026-11", "later")).toBeUndefined();
  });

  it("read as words", () => {
    expect(formatMonth("2026-03", "en-US")).toBe("March 2026");
  });

  it("are validated", () => {
    expect(isMonth("2026-03")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("all")).toBe(false);
  });

  it("says when a month has ended, in UTC", () => {
    expect(hasEnded("2026-11", new Date("2026-11-30T23:59:59Z"))).toBe(false);
    expect(hasEnded("2026-11", new Date("2026-12-01T00:00:00Z"))).toBe(true);
    expect(hasEnded("2026-12", new Date("2027-01-01T00:00:00Z"))).toBe(true);
    expect(closesFrom("2026-12").toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
