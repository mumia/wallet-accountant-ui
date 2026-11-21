import { describe, expect, it } from "vitest";

import { parseExactJson, stringifyExactJson, supportsJsonSourceText } from "./exact-json";

// What the backend sends: every amount with its currency's places (ADR-0002).
const wire =
  '{"eth":{"amount":1.000000000000000001,"currency":"ETH"},"eur":{"amount":100.00,"currency":"EUR"}}';

describe("exact JSON", () => {
  it("reads amounts as their exact text, trailing zeros included", () => {
    expect(parseExactJson(wire)).toEqual({
      eth: { amount: "1.000000000000000001", currency: "ETH" },
      eur: { amount: "100.00", currency: "EUR" },
    });
  });

  it("writes decimal-text amounts as exact JSON numbers", () => {
    expect(stringifyExactJson(parseExactJson(wire))).toBe(wire);
  });

  it("writes negative amounts and leaves other numbers alone", () => {
    expect(stringifyExactJson({ amount: "-3.50", limit: 200, note: "1.10" })).toBe(
      '{"amount":-3.50,"limit":200,"note":"1.10"}',
    );
  });

  it("leaves an amount that isn't decimal text as a string, for the backend to refuse", () => {
    expect(stringifyExactJson({ amount: "1e3" })).toBe('{"amount":"1e3"}');
  });

  it("finds JSON source text access in this runtime", () => {
    expect(supportsJsonSourceText()).toBe(true);
  });
});
