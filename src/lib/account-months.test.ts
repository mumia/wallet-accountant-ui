import { describe, expect, it } from "vitest";

import {
  defaultBookingMonth,
  toReviewCount,
  toReviewCountIn,
  toReviewMonths,
  transactionMonths,
} from "./account-months";

const months = [
  { booking_month: "2026-12", pending: 2, suspected_duplicates: 0 },
  { booking_month: "2026-11", pending: 0, suspected_duplicates: 0 },
  { booking_month: "2026-10", pending: 0, suspected_duplicates: 1 },
  { booking_month: "2026-09", pending: 0, suspected_duplicates: 0 },
];

describe("An Account's months", () => {
  it("open on the open month", () => {
    expect(defaultBookingMonth({ open_month: "2026-10" })).toBe("2026-10");
  });

  it("are all offered on Transactions", () => {
    expect(transactionMonths(months)).toEqual(["2026-12", "2026-11", "2026-10", "2026-09"]);
  });

  it("are offered on To review only with rows To review, or when chosen", () => {
    expect(toReviewMonths(months)).toEqual(["2026-12", "2026-10"]);
    expect(toReviewMonths(months, "2026-09")).toEqual(["2026-12", "2026-10", "2026-09"]);
  });

  it("count pending rows and Suspected duplicates To review", () => {
    expect(toReviewCount({ pending: 3, suspected_duplicates: 2 })).toBe(5);
    expect(toReviewCountIn(months, "2026-10")).toBe(1);
    expect(toReviewCountIn(months, "2026-11")).toBe(0);
    expect(toReviewCountIn(months, "2025-01")).toBe(0);
  });
});
