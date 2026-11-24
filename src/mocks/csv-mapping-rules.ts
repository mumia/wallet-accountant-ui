// The backend's CSV mapping validation, word for word
// (../wallet-accountant/internal/ingestion/domain/csvmapping.go, Validate), for
// the mock's Connection writes and mapping tests.
import type { components } from "../api/schema.gen";

type CsvMapping = components["schemas"]["CsvMapping"];
type CsvColumn = components["schemas"]["CsvColumn"];

const dateFormats = [
  "DD-MM-YYYY",
  "DD.MM.YYYY",
  "DD/MM/YY",
  "DD/MM/YYYY",
  "MM-DD-YYYY",
  "MM/DD/YY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "YYYYMMDD",
];

/** Every problem of `mapping`, in the backend's order; empty when it is valid. */
export function mappingProblems(mapping: Partial<CsvMapping>): string[] {
  const problems: string[] = [];
  const encoding = mapping.encoding ?? "UTF_8";
  if (encoding !== "UTF_8" && encoding !== "WINDOWS_1252" && encoding !== "UTF_16") {
    problems.push("the encoding must be UTF-8, Windows-1252 or UTF-16");
  }
  const delimiter = mapping.delimiter ?? "";
  if (!/^[^"\r\n]$/u.test(delimiter)) {
    problems.push("the delimiter must be one character other than a quote or a line break");
  }
  if ((mapping.skip_leading_lines ?? 0) < 0) {
    problems.push("the number of leading lines to skip must not be negative");
  }
  if ((mapping.skip_trailing_lines ?? 0) < 0) {
    problems.push("the number of trailing lines to skip must not be negative");
  }
  const dateFormat = mapping.date_format ?? "";
  if (!dateFormats.includes(dateFormat)) {
    problems.push(
      `the date format ${JSON.stringify(dateFormat)} is not one of ${dateFormats.join(", ")}`,
    );
  }
  const decimal = mapping.decimal_separator ?? "";
  if (decimal !== "." && decimal !== ",") {
    problems.push('the decimal separator must be "." or ","');
  }
  const thousands = mapping.thousands_separator ?? "";
  if (!["", ".", ",", " ", "'"].includes(thousands)) {
    problems.push(`the thousands separator must be empty, ".", ",", a space or "'"`);
  } else if (thousands !== "" && thousands === decimal) {
    problems.push("the thousands separator must differ from the decimal separator");
  }

  const columns = mapping.columns ?? {};
  const layout = mapping.amount_layout ?? "";
  const set = (column: CsvColumn | undefined) =>
    column !== undefined && (column.header ?? "") + String(column.position ?? 0) !== "0";
  if (layout === "SIGNED") {
    const sign = mapping.positive_amount_means ?? "";
    if (sign === "") {
      problems.push(
        "a signed amount needs to say whether a positive amount is money in or money out",
      );
    } else if (sign !== "MONEY_IN" && sign !== "MONEY_OUT") {
      problems.push("a positive amount must mean money in or money out");
    }
    if (set(columns.debit) || set(columns.credit)) {
      problems.push("a signed amount has no debit or credit columns");
    }
  } else if (layout === "DEBIT_CREDIT") {
    if (set(columns.amount)) {
      problems.push("debit and credit columns leave no room for a signed amount column");
    }
    if ((mapping.positive_amount_means ?? "") !== "") {
      problems.push("debit and credit columns have no sign to interpret");
    }
  } else if (layout === "") {
    problems.push("the amount layout is required: one signed column, or debit and credit columns");
  } else {
    problems.push("the amount layout must be signed or debit and credit");
  }

  const fields: [string, CsvColumn | undefined, boolean][] = [
    ["Booking date", columns.booking_date, true],
    ["description", columns.description, true],
    ["amount", columns.amount, layout === "SIGNED"],
    ["debit", columns.debit, layout === "DEBIT_CREDIT"],
    ["credit", columns.credit, layout === "DEBIT_CREDIT"],
    ["Transaction date", columns.transaction_date, false],
    ["Value date", columns.value_date, false],
    ["payee", columns.payee, false],
    ["bank transaction ID", columns.bank_transaction_id, false],
  ];
  const headers = new Map<string, string>();
  const positions = new Map<number, string>();
  for (const [name, column, required] of fields) {
    const header = column?.header ?? "";
    const position = column?.position ?? 0;
    if (header === "" && position === 0) {
      if (required) {
        problems.push(`the ${name} column is required`);
      }
    } else if (header !== "" && position !== 0) {
      problems.push(`the ${name} column must be given by header or by position, not both`);
    } else if (position < 0) {
      problems.push(`the ${name} column's position must be 1 or more`);
    } else if (position > 0) {
      const other = positions.get(position);
      if (other !== undefined) {
        problems.push(`the ${other} and ${name} are both read from column ${String(position)}`);
      }
      positions.set(position, name);
    } else if (header.trim() === "") {
      problems.push(`the ${name} column's header must not be blank`);
    } else if (mapping.has_header_row !== true) {
      problems.push(`the ${name} column is given by header, but the file has no header row`);
    } else {
      const key = header.trim().toLowerCase();
      const other = headers.get(key);
      if (other !== undefined) {
        problems.push(
          `the ${other} and ${name} are both read from column ${JSON.stringify(header)}`,
        );
      }
      headers.set(key, name);
    }
  }
  return problems;
}

/** The detail of the backend's `/problems/invalid-csv-mapping`. */
export function mappingDetail(problems: readonly string[]): string {
  return `The CSV mapping is invalid: ${problems.join("; ")}.`;
}
