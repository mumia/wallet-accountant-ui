// How the mock API reads a statement file with a Connection's CSV mapping: a
// small stand-in for the backend's reader
// (../wallet-accountant/internal/ingestion/domain/statementfile.go), with its
// reasons for unreadable lines. It reads plain delimited lines (no quoting), the
// date formats YYYY-MM-DD and DD/MM/YYYY, and a signed amount column.
import type { components } from "../api/schema.gen";

type CsvMapping = components["schemas"]["CsvMapping"];
type CsvColumn = components["schemas"]["CsvColumn"];
type RowError = components["schemas"]["RowError"];

export interface StatementRow {
  /** The line in the file, counted from 1. */
  line: number;
  bookingDate: string;
  description: string;
  /** Exact decimal text with the currency's places. */
  amount: string;
  bankTransactionId?: string;
}

export type ReadFile =
  | { kind: "rows"; rows: StatementRow[] }
  | { kind: "unreadable"; rows: RowError[] }
  | { kind: "empty" };

function readDate(text: string, format: string): string | undefined {
  if (format === "YYYY-MM-DD" && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (format === "DD/MM/YYYY" && dmy !== null) {
    const [, day, month, year] = dmy;
    return [year, month, day].join("-");
  }
  return undefined;
}

/** Reads `file` with `mapping`; amounts may have at most `places` decimal places. */
export function readStatementFile(file: string, mapping: CsvMapping, places: number): ReadFile {
  const delimiter = mapping.delimiter ?? ",";
  const decimal = mapping.decimal_separator ?? ".";
  const thousands = mapping.thousands_separator;
  const lines = file.replace(/\r\n/g, "\n").split("\n");
  let index = mapping.skip_leading_lines;
  const headers = new Map<string, number>();
  if (mapping.has_header_row) {
    (lines[index] ?? "").split(delimiter).forEach((name, position) => {
      headers.set(name.trim().toLowerCase(), position);
    });
    index += 1;
  }
  const column = (wanted: CsvColumn | undefined) =>
    wanted?.position !== undefined
      ? wanted.position - 1
      : wanted?.header === undefined
        ? undefined
        : headers.get(wanted.header.trim().toLowerCase());
  const columns = mapping.columns ?? {};

  const rows: StatementRow[] = [];
  const errors: RowError[] = [];
  for (; index < lines.length; index += 1) {
    const text = lines[index] ?? "";
    if (text.trim() === "") {
      continue;
    }
    const line = index + 1;
    const cells = text.split(delimiter).map((cell) => cell.trim());
    const cell = (wanted: CsvColumn | undefined) => {
      const at = column(wanted);
      return at === undefined ? "" : (cells[at] ?? "");
    };
    const problems: string[] = [];

    const dateText = cell(columns.booking_date);
    const bookingDate = readDate(dateText, mapping.date_format ?? "YYYY-MM-DD");
    if (dateText === "") {
      problems.push("the Booking date is blank");
    } else if (bookingDate === undefined) {
      problems.push(
        `the Booking date "${dateText}" is not a date in the format ${mapping.date_format ?? ""}`,
      );
    }

    const amountText = cell(columns.amount);
    const ungrouped = thousands === "" ? amountText : amountText.split(thousands).join("");
    const amount = ungrouped.split(decimal).join(".");
    const [, fraction = ""] = amount.split(".");
    if (!/^-?\d+(\.\d+)?$/.test(amount)) {
      problems.push(`the amount "${amountText}" is not a number`);
    } else if (fraction.replace(/0+$/, "").length > places) {
      problems.push(
        `the amount ${amount} has more than the ${String(places)} decimal places of the Account currency`,
      );
    }

    if (problems.length > 0 || bookingDate === undefined) {
      errors.push({ line, reason: problems.join("; ") });
      continue;
    }
    const sign = mapping.positive_amount_means === "MONEY_OUT" ? -1n : 1n;
    const bankTransactionId = cell(columns.bank_transaction_id);
    rows.push({
      line,
      bookingDate,
      description: cell(columns.description),
      amount: fromUnits(toUnits(amount, places) * sign, places),
      ...(bankTransactionId === "" ? {} : { bankTransactionId }),
    });
  }
  if (errors.length > 0) {
    return { kind: "unreadable", rows: errors };
  }
  return rows.length === 0 ? { kind: "empty" } : { kind: "rows", rows };
}

/** Exact decimal text as whole minor units: "-12.30" with 2 places is -1230n. */
export function toUnits(amount: string, places: number): bigint {
  const negative = amount.startsWith("-");
  const [whole = "0", fraction = ""] = amount.replace(/^-/, "").split(".");
  const units = BigInt(whole + fraction.padEnd(places, "0").slice(0, places));
  return negative ? -units : units;
}

/** Whole minor units as exact decimal text with `places` places. */
export function fromUnits(units: bigint, places: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(places + 1, "0");
  const whole = digits.slice(0, digits.length - places);
  const fraction = digits.slice(digits.length - places);
  return `${negative ? "-" : ""}${whole}${places > 0 ? `.${fraction}` : ""}`;
}

/** A short, stable fingerprint of text, for the mock's preview IDs and repeat files. */
export function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/** The mock's currencies' decimal places, as `GET /currencies` serves them. */
export function currencyPlaces(currency: string): number {
  return ({ ETH: 18, EUR: 2, GBP: 2, JPY: 0, USD: 2 } as Record<string, number>)[currency] ?? 2;
}
