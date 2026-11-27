import { describe, expect, it } from "vitest";

import { cashDateRange, countedOnRange, lastDayOf } from "./cash-dates";

// Noon UTC, so the local date is the same in every zone the tests run in.
const now = new Date("2026-11-27T12:00:00Z");

describe("cashDateRange", () => {
  it("starts at the open month's 1st when the start date is earlier", () => {
    expect(cashDateRange({ start_date: "2026-09-15", open_month: "2026-11" }, now)).toEqual({
      min: "2026-11-01",
      max: "2026-11-27",
      minReason: "closed-month",
      initial: "2026-11-27",
    });
  });

  it("starts at the start date when it is inside the open month", () => {
    expect(cashDateRange({ start_date: "2026-11-12", open_month: "2026-11" }, now)).toMatchObject({
      min: "2026-11-12",
      minReason: "start-date",
    });
  });

  it("starts at the start date when it is the open month's 1st", () => {
    expect(cashDateRange({ start_date: "2026-11-01", open_month: "2026-11" }, now)).toMatchObject({
      min: "2026-11-01",
      minReason: "start-date",
    });
  });

  it("lets later months through, up to today", () => {
    expect(cashDateRange({ start_date: "2026-08-03", open_month: "2026-09" }, now)).toMatchObject({
      min: "2026-09-01",
      max: "2026-11-27",
    });
  });

  it("ends at today in UTC", () => {
    const lateEvening = new Date("2026-11-27T23:30:00Z");
    expect(
      cashDateRange({ start_date: "2026-11-01", open_month: "2026-11" }, lateEvening).max,
    ).toBe("2026-11-27");
  });
});

describe("lastDayOf", () => {
  it("knows each month's length, leap years included", () => {
    expect(lastDayOf("2026-11")).toBe("2026-11-30");
    expect(lastDayOf("2026-12")).toBe("2026-12-31");
    expect(lastDayOf("2026-02")).toBe("2026-02-28");
    expect(lastDayOf("2028-02")).toBe("2028-02-29");
  });
});

describe("countedOnRange", () => {
  it("runs from the day after the month's last day to today", () => {
    expect(countedOnRange("2026-10", now)).toEqual({
      min: "2026-11-01",
      max: "2026-11-27",
      initial: "2026-11-27",
    });
  });

  it("rolls December into the next year", () => {
    expect(countedOnRange("2025-12", now)).toMatchObject({ min: "2026-01-01" });
  });

  it("ends at today in UTC", () => {
    const lateEvening = new Date("2026-11-27T23:30:00Z");
    expect(countedOnRange("2026-10", lateEvening).max).toBe("2026-11-27");
  });

  it("is empty while the month hasn't ended", () => {
    const range = countedOnRange("2026-11", now);
    expect(range.min > range.max).toBe(true);
  });
});
