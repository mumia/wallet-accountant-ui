import { describe, expect, it } from "vitest";

import { differenceForDisplay, formatDecimal, formatMoney, parseAmountInput } from "./money";

describe("formatMoney", () => {
  it.each([
    [{ amount: "1234.50", currency: "EUR" }, "€1,234.50"],
    [{ amount: "-3.50", currency: "EUR" }, "-€3.50"],
    [{ amount: "1235", currency: "JPY" }, "¥1,235"],
    [{ amount: "100.00", currency: "USD" }, "$100.00"],
  ] as const)("formats %j in en-US as %s", (money, text) => {
    expect(formatMoney(money, "en-US")).toBe(text);
  });

  it("keeps all 18 places of ETH exactly", () => {
    expect(formatMoney({ amount: "1.000000000000000001", currency: "ETH" }, "en-US")).toBe(
      "ETH\u00a01.000000000000000001",
    );
  });

  it("formats in the User's locale", () => {
    expect(formatMoney({ amount: "1234.50", currency: "EUR" }, "de-DE")).toBe("1.234,50\u00a0€");
  });

  it("formats a code Intl doesn't know after the amount", () => {
    expect(formatMoney({ amount: "5.0000", currency: "USDT" }, "en-US")).toBe("5.0000 USDT");
  });
});

describe("parseAmountInput", () => {
  it.each([
    ["1234.5", 2, "en-US", "1234.50"],
    ["1,234.56", 2, "en-US", "1234.56"],
    ["-3.5", 2, "en-US", "-3.50"],
    ["\u22123.5", 2, "en-US", "-3.50"],
    ["1.234,56", 2, "de-DE", "1234.56"],
    ["1\u202f234,56", 2, "fr-FR", "1234.56"],
    ["007", 2, "en-US", "7.00"],
    [".5", 2, "en-US", "0.50"],
    ["12.", 2, "en-US", "12.00"],
    ["-0", 2, "en-US", "0.00"],
    ["1235", 0, "en-US", "1235"],
    ["1.000000000000000001", 18, "en-US", "1.000000000000000001"],
    ["2.50000", 2, "en-US", "2.50"],
  ])("reads %s with %i places in %s as %s", (text, places, locale, amount) => {
    expect(parseAmountInput(text, places, locale)).toEqual({ kind: "ok", amount });
  });

  it("refuses more places than the currency has", () => {
    expect(parseAmountInput("1.234", 2, "en-US")).toEqual({ kind: "too-many-places", places: 2 });
    expect(parseAmountInput("1.5", 0, "en-US")).toEqual({ kind: "too-many-places", places: 0 });
  });

  it.each(["abc", "1.2.3", "--1", "1-", "-", ".", "1e3"])("refuses %s", (text) => {
    expect(parseAmountInput(text, 2, "en-US")).toEqual({ kind: "invalid" });
  });

  it("reads an empty field as empty", () => {
    expect(parseAmountInput("  ", 2, "en-US")).toEqual({ kind: "empty" });
  });
});

describe("formatDecimal", () => {
  it("groups without a currency, keeping every place", () => {
    expect(formatDecimal("-1234.50", "en-US")).toBe("-1,234.50");
  });
});

describe("differenceForDisplay", () => {
  it("subtracts exactly", () => {
    expect(
      differenceForDisplay(
        { amount: "0.30", currency: "EUR" },
        { amount: "0.10", currency: "EUR" },
      ),
    ).toEqual({ amount: "0.20", currency: "EUR" });
    expect(
      differenceForDisplay(
        { amount: "1.000000000000000001", currency: "ETH" },
        { amount: "2.000000000000000000", currency: "ETH" },
      ),
    ).toEqual({ amount: "-0.999999999999999999", currency: "ETH" });
  });

  it("refuses two currencies", () => {
    expect(() =>
      differenceForDisplay(
        { amount: "1.00", currency: "EUR" },
        { amount: "1.00", currency: "USD" },
      ),
    ).toThrow();
  });
});
