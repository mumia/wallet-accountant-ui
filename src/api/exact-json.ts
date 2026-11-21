// The only place an amount crosses between JSON text and the app (ADR-0002).
// Money.amount is the contract's only `format: decimal` field, and every one is
// a property named `amount`: it arrives as decimal text and leaves as an exact
// JSON number, never as a JS number.
import type { Decimal } from "./schema.gen";

const decimalText = /^-?\d+(\.\d+)?$/;

/** JSON.parse, with every numeric `amount` kept as its exact source text. */
export function parseExactJson(text: string): unknown {
  return JSON.parse(text, (key, value, context) =>
    key === "amount" && typeof value === "number" ? context.source : value,
  );
}

/** JSON.stringify, with every decimal-text `amount` written as an exact JSON number. */
export function stringifyExactJson(body: unknown): string {
  return JSON.stringify(body, (key, value: unknown) =>
    key === "amount" && typeof value === "string" && decimalText.test(value)
      ? JSON.rawJSON(value)
      : value,
  );
}

/** Whether a string is decimal text the backend accepts as an amount. */
export function isDecimal(value: string): value is Decimal {
  return decimalText.test(value);
}

/**
 * Whether the browser can read JSON source text (Chrome and Edge 114, Firefox
 * 135, Safari 18.4). Without it amounts can't be exact, so the app doesn't start.
 */
export function supportsJsonSourceText(): boolean {
  try {
    return (
      typeof JSON.rawJSON === "function" &&
      JSON.parse("1.0", (_key, _value, context) => context.source) === "1.0" &&
      JSON.stringify({ amount: JSON.rawJSON("1.0") }) === '{"amount":1.0}'
    );
  } catch {
    return false;
  }
}
