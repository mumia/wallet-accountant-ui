import { describe, expect, it } from "vitest";

import { bookingMonthSearch } from "./search";

describe("booking_month", () => {
  it.each(["2026-03", "2026-12", "all"])("keeps %s", (month) => {
    expect(bookingMonthSearch.parse({ booking_month: month })).toEqual({ booking_month: month });
  });

  it.each(["2026-13", "2026-3", "March", ""])("drops %j", (month) => {
    expect(bookingMonthSearch.parse({ booking_month: month })).toEqual({});
  });
});
