import { describe, expect, it } from "vitest";

import { addMonths, formatMonth, isMonth, monthOf, monthsBetween } from "./month";

describe("Booking months", () => {
  it("are read from dates", () => {
    expect(monthOf("2026-03-09")).toBe("2026-03");
    expect(monthOf(new Date(2026, 11, 31))).toBe("2026-12");
  });

  it("step across years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("list newest first", () => {
    expect(monthsBetween("2025-11", "2026-02")).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
      "2025-11",
    ]);
    expect(monthsBetween("2026-02", "2026-02")).toEqual(["2026-02"]);
  });

  it("read as words", () => {
    expect(formatMonth("2026-03", "en-US")).toBe("March 2026");
  });

  it("are validated", () => {
    expect(isMonth("2026-03")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("all")).toBe(false);
  });
});
