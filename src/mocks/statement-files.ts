// How the mock API reads a statement file with a Connection's CSV mapping: a
// small stand-in for the backend's reader
// (../wallet-accountant/internal/ingestion/domain/statementfile.go), with its
// reasons for unreadable lines. It reads plain delimited lines (no quoting),
// every date format the contract lists, and either amount layout.
import type { components } from "../api/schema.gen";

type CsvMapping = components["schemas"]["CsvMapping"];
type CsvColumn = components["schemas"]["CsvColumn"];
type RowError = components["schemas"]["RowError"];

export interface StatementRow {
  /** The line in the file, counted from 1. */
  line: number;
  bookingDate: string;
  /** The Booking date when the file has none. */
  transactionDate: string;
  valueDate?: string;
  description: string;
  payee?: string;
  /** Exact decimal text with the currency's places. */
  amount: string;
  bankTransactionId?: string;
}

export type ReadFile =
  | { kind: "rows"; rows: StatementRow[] }
  | { kind: "unreadable"; rows: RowError[] }
  | { kind: "empty" };

/** A date format as a pattern capturing year, month and day. */
function datePattern(format: string): RegExp {
  const source = format
    .replace(/[./-]/g, (separator) => `\\${separator}`)
    .replace("YYYY", "(?<y>\\d{4})")
    .replace("YY", "(?<yy>\\d{2})")
    .replace("MM", "(?<m>\\d{2})")
    .replace("DD", "(?<d>\\d{2})");
  return new RegExp(`^${source}$`);
}

const dateFormats = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "YYYYMMDD",
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "DD.MM.YYYY",
  "MM/DD/YYYY",
  "MM-DD-YYYY",
  "DD/MM/YY",
  "MM/DD/YY",
];

function readDate(text: string, format: string): string | undefined {
  if (!dateFormats.includes(format)) {
    return undefined;
  }
  const groups = datePattern(format).exec(text)?.groups;
  if (groups === undefined) {
    return undefined;
  }
  const short = groups["yy"];
  // Go's two-digit years: 69–99 are 1900s, the rest 2000s.
  const year =
    short === undefined ? (groups["y"] ?? "") : `${Number(short) >= 69 ? "19" : "20"}${short}`;
  const month = groups["m"] ?? "";
  const day = groups["d"] ?? "";
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(day)
    ? undefined
    : `${year}-${month}-${day}`;
}

/** Every readable row of `file` and every line it can't read, with `mapping`. */
export function collectStatementFile(
  file: string,
  mapping: Partial<CsvMapping>,
  places: number,
): { rows: StatementRow[]; errors: RowError[] } {
  const delimiter = mapping.delimiter ?? ",";
  const decimal = mapping.decimal_separator ?? ".";
  const thousands = mapping.thousands_separator ?? "";
  const lines = file
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  let index = mapping.skip_leading_lines ?? 0;
  const headers = new Map<string, number>();
  if (mapping.has_header_row === true) {
    (lines[index] ?? "").split(delimiter).forEach((name, position) => {
      const key = name.trim().toLowerCase();
      if (!headers.has(key)) {
        headers.set(key, position);
      }
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
  const number = (text: string) => {
    const ungrouped = thousands === "" ? text : text.split(thousands).join("");
    const plain = ungrouped.split(decimal).join(".").replace(/^\+/, "");
    return /^-?\d+(\.\d+)?$/.test(plain) ? plain : undefined;
  };

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
    const date = (name: string, wanted: CsvColumn | undefined, required: boolean) => {
      const value = cell(wanted);
      if (value === "") {
        if (required) {
          problems.push(`the ${name} is blank`);
        }
        return undefined;
      }
      const read = readDate(value, mapping.date_format ?? "");
      if (read === undefined) {
        problems.push(
          `the ${name} "${value}" is not a date in the format ${mapping.date_format ?? ""}`,
        );
      }
      return read;
    };

    const bookingDate = date("Booking date", columns.booking_date, true);
    const transactionDate = date("Transaction date", columns.transaction_date, false);
    const valueDate = date("Value date", columns.value_date, false);

    let amount: string | undefined;
    if (mapping.amount_layout === "DEBIT_CREDIT") {
      const debit = cell(columns.debit);
      const credit = cell(columns.credit);
      if (debit === "" && credit === "") {
        problems.push("both the debit and the credit are blank");
      } else if (debit !== "" && credit !== "") {
        problems.push("the row has both a debit and a credit");
      } else {
        const read = number(debit === "" ? credit : debit);
        if (read === undefined) {
          problems.push(
            debit === ""
              ? `the credit "${credit}" is not a number`
              : `the debit "${debit}" is not a number`,
          );
        } else {
          const magnitude = read.replace(/^-/, "");
          amount = debit === "" ? magnitude : `-${magnitude}`;
        }
      }
    } else {
      const amountText = cell(columns.amount);
      const read = number(amountText);
      if (amountText === "") {
        problems.push("the amount is blank");
      } else if (read === undefined) {
        problems.push(`the amount "${amountText}" is not a number`);
      } else {
        amount =
          mapping.positive_amount_means === "MONEY_OUT"
            ? read.startsWith("-")
              ? read.slice(1)
              : `-${read}`
            : read;
      }
    }
    const [, fraction = ""] = (amount ?? "").split(".");
    if (amount !== undefined && fraction.replace(/0+$/, "").length > places) {
      problems.push(
        `the amount ${amount} has more than the ${String(places)} decimal places of the Account currency`,
      );
    }

    if (problems.length > 0 || bookingDate === undefined || amount === undefined) {
      errors.push({ line, reason: problems.join("; ") });
      continue;
    }
    const payee = cell(columns.payee);
    const bankTransactionId = cell(columns.bank_transaction_id);
    rows.push({
      line,
      bookingDate,
      transactionDate: transactionDate ?? bookingDate,
      ...(valueDate === undefined ? {} : { valueDate }),
      description: cell(columns.description),
      ...(payee === "" ? {} : { payee }),
      amount: fromUnits(toUnits(amount, places), places),
      ...(bankTransactionId === "" ? {} : { bankTransactionId }),
    });
  }
  return { rows, errors };
}

/**
 * Decodes a statement file's bytes with the mapping's encoding, then reads
 * them as `collectStatementFile` does. A file the encoding can't read is one
 * unreadable line, 1, as in the backend's parseStatementFile.
 */
export function parseStatementFile(
  bytes: ArrayBuffer,
  mapping: Partial<CsvMapping>,
  places: number,
): { rows: StatementRow[]; errors: RowError[] } {
  const decoded = decodeStatementFile(bytes, mapping.encoding);
  return decoded.kind === "unreadable"
    ? { rows: [], errors: [{ line: 1, reason: decoded.reason }] }
    : collectStatementFile(decoded.text, mapping, places);
}

/** Reads a statement file with `mapping`; amounts may have at most `places` decimal places. */
export function readStatementFile(
  bytes: ArrayBuffer,
  mapping: CsvMapping,
  places: number,
): ReadFile {
  const { rows, errors } = parseStatementFile(bytes, mapping, places);
  if (errors.length > 0) {
    return { kind: "unreadable", rows: errors };
  }
  return rows.length === 0 ? { kind: "empty" } : { kind: "rows", rows };
}

/**
 * A statement file's bytes as text, decoded with the mapping's encoding as the
 * backend does (../wallet-accountant/internal/ingestion/domain/encoding.go),
 * or why it can't be.
 * UTF-16 takes its byte order from its byte order mark, which is dropped, and
 * is little-endian without one. Under another encoding a UTF-16 byte order
 * mark is refused and a UTF-8 one dropped.
 */
export function decodeStatementFile(
  buffer: ArrayBuffer,
  encoding: string | undefined,
): { kind: "text"; text: string } | { kind: "unreadable"; reason: string } {
  const bytes = new Uint8Array(buffer);
  const bom = (...marker: number[]) => marker.every((byte, index) => bytes[index] === byte);
  if (encoding === "UTF_16") {
    if (bytes.length % 2 !== 0) {
      return {
        kind: "unreadable",
        reason: "the file has an odd number of bytes, so it is not UTF-16",
      };
    }
    return {
      kind: "text",
      text: new TextDecoder(bom(0xfe, 0xff) ? "utf-16be" : "utf-16le").decode(bytes),
    };
  }
  if (bom(0xff, 0xfe) || bom(0xfe, 0xff)) {
    return {
      kind: "unreadable",
      reason: "the file starts with a UTF-16 byte order mark; set the mapping's encoding to UTF-16",
    };
  }
  const text = bom(0xef, 0xbb, 0xbf) ? bytes.subarray(3) : bytes;
  return {
    kind: "text",
    text: new TextDecoder(encoding === "WINDOWS_1252" ? "windows-1252" : "utf-8").decode(text),
  };
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
