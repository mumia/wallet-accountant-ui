// The money module (ADR-0002): the only code that reads an amount's digits.
// Amounts are exact decimal text (`Decimal`), formatted with Intl from the text
// itself and never turned into a JS number. big.js is used only here, only for
// figures shown to the User and never sent.
import Big from "big.js";

import { isDecimal } from "../api/exact-json";
import type { components, Decimal } from "../api/schema.gen";

export type { Decimal };
export type Money = components["schemas"]["Money"];

/** Digits after the decimal point; returned amounts always carry their currency's places. */
function fractionDigits(amount: Decimal): number {
  const point = amount.indexOf(".");
  return point === -1 ? 0 : amount.length - point - 1;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string | undefined, options: Intl.NumberFormatOptions) {
  const cacheKey = JSON.stringify([locale, options]);
  let cached = formatters.get(cacheKey);
  if (cached === undefined) {
    cached = new Intl.NumberFormat(locale, options);
    formatters.set(cacheKey, cached);
  }
  return cached;
}

// Intl knows only three-letter (ISO 4217-shaped) codes; the contract allows up to five.
const intlCurrency = /^[A-Z]{3}$/;

/**
 * "€1,234.50", "-€3.50", "¥1,235", "ETH 1.000000000000000001": the locale's
 * format with every decimal place the amount carries, and a plain minus.
 */
export function formatMoney(money: Money, locale?: string): string {
  const digits = fractionDigits(money.amount);
  const places = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  if (intlCurrency.test(money.currency)) {
    return formatter(locale, { style: "currency", currency: money.currency, ...places }).format(
      money.amount,
    );
  }
  return `${formatter(locale, places).format(money.amount)} ${money.currency}`;
}

/** An amount without its currency, in the locale's format: "1,234.50". */
export function formatDecimal(amount: Decimal, locale?: string): string {
  const digits = fractionDigits(amount);
  return formatter(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

interface Separators {
  group: string;
  decimal: string;
}

function separators(locale: string | undefined): Separators {
  const parts = formatter(locale, {}).formatToParts(-12345.6);
  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

export type ParsedAmount =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "too-many-places"; places: number }
  | { kind: "ok"; amount: Decimal };

const spaces = /[\s\u00a0\u202f]/g;
const minusSigns = /^[-\u2212]/;

/**
 * Reads what a User typed, in their locale ("1.234,56" in German): the locale's
 * group and decimal separators and a leading minus. Gives canonical decimal text
 * with the currency's places ("-1234.50"), or why it can't.
 */
export function parseAmountInput(
  text: string,
  decimalPlaces: number,
  locale?: string,
): ParsedAmount {
  const { group, decimal } = separators(locale);
  let typed = text.trim();
  if (typed === "") {
    return { kind: "empty" };
  }
  const negative = minusSigns.test(typed);
  typed = typed.replace(minusSigns, "");
  if (spaces.test(group)) {
    typed = typed.replace(spaces, "");
  } else {
    typed = typed.split(group).join("");
  }
  const [whole = "", fraction, ...rest] = typed.split(decimal);
  if (
    rest.length > 0 ||
    !/^\d*$/.test(whole) ||
    (fraction !== undefined && !/^\d*$/.test(fraction))
  ) {
    return { kind: "invalid" };
  }
  if (whole === "" && (fraction ?? "") === "") {
    return { kind: "invalid" };
  }
  const digits = (fraction ?? "").replace(/0+$/, "");
  if (digits.length > decimalPlaces) {
    return { kind: "too-many-places", places: decimalPlaces };
  }
  const integer = whole.replace(/^0+(?=\d)/, "") || "0";
  const padded = (fraction ?? "").padEnd(decimalPlaces, "0").slice(0, decimalPlaces);
  const unsigned = decimalPlaces > 0 ? `${integer}.${padded}` : integer;
  const isZero = /^[0.]+$/.test(unsigned);
  const amount = `${negative && !isZero ? "-" : ""}${unsigned}`;
  return isDecimal(amount) ? { kind: "ok", amount } : { kind: "invalid" };
}

/**
 * a − b, for display only (the Month close difference): never send the result.
 * Both carry the same currency, so the result keeps its places.
 */
export function differenceForDisplay(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Can't subtract ${b.currency} from ${a.currency}`);
  }
  const places = Math.max(fractionDigits(a.amount), fractionDigits(b.amount));
  const amount = new Big(a.amount).minus(b.amount).toFixed(places);
  if (!isDecimal(amount)) {
    throw new Error(`big.js gave ${amount}`);
  }
  return { amount, currency: a.currency };
}
