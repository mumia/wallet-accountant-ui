import { describe, expect, it } from "vitest";

import { firstOfMonth, formatDate, fromIsoDate, parseDateInput, toIsoDate, today } from "./date";

describe("calendar dates", () => {
  it("round-trip through a local Date", () => {
    expect(toIsoDate(fromIsoDate("2026-03-09"))).toBe("2026-03-09");
  });

  it("know today and the 1st of this month, in local time", () => {
    const now = new Date(2026, 10, 21, 23, 59);
    expect(today(now)).toBe("2026-11-21");
    expect(firstOfMonth(now)).toBe("2026-11-01");
  });

  it("are shown in the locale's order", () => {
    expect(formatDate("2026-11-01", "en-US")).toBe("11/01/2026");
    expect(formatDate("2026-11-01", "en-GB")).toBe("01/11/2026");
    expect(formatDate("2026-11-01", "de-DE")).toBe("01.11.2026");
  });

  it.each([
    ["11/01/2026", "en-US", "2026-11-01"],
    ["1/11/26", "en-GB", "2026-11-01"],
    ["01.11.2026", "de-DE", "2026-11-01"],
    [" 2026-11-01 ", "en-US", "2026-11-01"],
    ["2026-2-28", "en-GB", "2026-02-28"],
  ])("read %j in %s as %s", (text, locale, date) => {
    expect(parseDateInput(text, locale)).toBe(date);
  });

  it.each([
    ["", "en-US"],
    ["31/02/2026", "en-GB"],
    ["13/13/2026", "en-US"],
    ["11/01", "en-US"],
    ["11/01/202", "en-US"],
    ["tomorrow", "en-US"],
  ])("refuse %j in %s", (text, locale) => {
    expect(parseDateInput(text, locale)).toBeUndefined();
  });
});
