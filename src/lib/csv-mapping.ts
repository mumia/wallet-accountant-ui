// The CSV mapping editor's form (spec, "CSV mapping editor"): its values, the
// rules it checks before Save (mirroring the backend's
// ../wallet-accountant/internal/ingestion/domain/csvmapping.go), and the
// contract's CsvMapping it reads and writes.
import { z } from "zod";

import type { components } from "../api/schema.gen";

export type CsvMapping = components["schemas"]["CsvMapping"];
type CsvColumn = components["schemas"]["CsvColumn"];

/**
 * The values each choice offers, in the order offered. Those the contract lists
 * as an `x-extensible-enum` are checked against it (csv-mapping.test.ts); a
 * saved value the UI doesn't know is still shown, as it is.
 */
export const choices = {
  encoding: ["UTF_8", "WINDOWS_1252", "UTF_16"],
  /** Not an enum in the contract: any one character. */
  delimiter: [";", ",", "\t", "|"],
  date_format: [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "DD-MM-YYYY",
    "DD.MM.YYYY",
    "MM/DD/YYYY",
    "MM-DD-YYYY",
    "YYYY/MM/DD",
    "YYYYMMDD",
    "DD/MM/YY",
    "MM/DD/YY",
  ],
  decimal_separator: [".", ","],
  thousands_separator: ["", ".", ",", " ", "'"],
  amount_layout: ["SIGNED", "DEBIT_CREDIT"],
  positive_amount_means: ["MONEY_IN", "MONEY_OUT"],
} as const;

export type Choice = keyof typeof choices;

/** An encoding the editor offers. */
export type Encoding = (typeof choices.encoding)[number];

/** Whether `value` is one of the values `choice` offers by name. */
export function isKnownChoice<C extends Choice>(
  choice: C,
  value: string,
): value is (typeof choices)[C][number] {
  return (choices[choice] as readonly string[]).includes(value);
}

/** Every field a column can hold, in the order the editor lists them. */
export const columnFields = [
  "booking_date",
  "description",
  "amount",
  "debit",
  "credit",
  "transaction_date",
  "value_date",
  "payee",
  "bank_transaction_id",
] as const;

export type ColumnField = (typeof columnFields)[number];

/**
 * A picked column: `h:<name>` by its header, `p:<n>` by its position counted
 * from 1, or "" for none. The User only ever picks a column; the editor writes
 * a header when the file has a header row and a position otherwise.
 */
export type ColumnKey = string;

export const headerKey = (name: string): ColumnKey => `h:${name}`;
export const positionKey = (position: number): ColumnKey => `p:${String(position)}`;

export type ParsedColumn = { header: string } | { position: number };

export function parseColumnKey(key: ColumnKey): ParsedColumn | undefined {
  if (key.startsWith("h:")) {
    return { header: key.slice(2) };
  }
  const position = /^p:(\d+)$/.exec(key)?.[1];
  return position === undefined ? undefined : { position: Number(position) };
}

/** The editor's values. Numbers are kept as typed. */
export interface MappingForm {
  name: string;
  encoding: string;
  delimiter: string;
  hasHeaderRow: boolean;
  skipLeadingLines: string;
  skipTrailingLines: string;
  dateFormat: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  amountLayout: string;
  positiveAmountMeans: string;
  columns: Record<ColumnField, ColumnKey>;
}

/** One character other than a quote or a line break, as the backend accepts. */
export function isDelimiter(text: string): boolean {
  return /^[^"\r\n]$/u.test(text);
}

/** The columns a layout reads; an unknown layout keeps every column. */
export function columnsFor(layout: string): ColumnField[] {
  if (layout === "SIGNED") {
    return columnFields.filter((field) => field !== "debit" && field !== "credit");
  }
  if (layout === "DEBIT_CREDIT") {
    return columnFields.filter((field) => field !== "amount");
  }
  return [...columnFields];
}

/** The columns a mapping can't do without, for its layout. */
export function requiredColumns(layout: string): ColumnField[] {
  return [
    "booking_date",
    "description",
    ...(layout === "SIGNED" ? (["amount"] as const) : []),
    ...(layout === "DEBIT_CREDIT" ? (["debit", "credit"] as const) : []),
  ];
}

const noColumns = Object.fromEntries(columnFields.map((field) => [field, ""])) as Record<
  ColumnField,
  ColumnKey
>;

/** A new Connection's mapping before any sample file is read. */
export function newMappingForm(name: string): MappingForm {
  return {
    name,
    encoding: "UTF_8",
    delimiter: ";",
    hasHeaderRow: true,
    skipLeadingLines: "0",
    skipTrailingLines: "0",
    dateFormat: "",
    decimalSeparator: ".",
    thousandsSeparator: "",
    amountLayout: "SIGNED",
    positiveAmountMeans: "MONEY_IN",
    columns: { ...noColumns },
  };
}

function columnKey(column: CsvColumn | undefined): ColumnKey {
  if (column?.header !== undefined) {
    return headerKey(column.header);
  }
  return column?.position === undefined ? "" : positionKey(column.position);
}

/** A saved Connection as the editor's values. */
export function mappingForm(name: string, mapping: CsvMapping | undefined): MappingForm {
  if (mapping === undefined) {
    return newMappingForm(name);
  }
  const columns = mapping.columns ?? {};
  return {
    name,
    encoding: mapping.encoding,
    delimiter: mapping.delimiter ?? "",
    hasHeaderRow: mapping.has_header_row,
    skipLeadingLines: String(mapping.skip_leading_lines),
    skipTrailingLines: String(mapping.skip_trailing_lines),
    dateFormat: mapping.date_format ?? "",
    decimalSeparator: mapping.decimal_separator ?? "",
    thousandsSeparator: mapping.thousands_separator,
    amountLayout: mapping.amount_layout ?? "",
    positiveAmountMeans: mapping.positive_amount_means ?? "",
    columns: Object.fromEntries(
      columnFields.map((field) => [field, columnKey(columns[field])]),
    ) as Record<ColumnField, ColumnKey>,
  };
}

/**
 * The editor's values as the contract's CsvMapping. Only the columns the layout
 * reads are written, and whether a positive amount is money in only for a
 * signed amount.
 */
export function csvMapping(form: MappingForm): CsvMapping {
  const columns: Partial<Record<ColumnField, CsvColumn>> = {};
  for (const field of columnsFor(form.amountLayout)) {
    const column = parseColumnKey(form.columns[field]);
    if (column !== undefined) {
      columns[field] = column;
    }
  }
  const signed = form.amountLayout !== "DEBIT_CREDIT";
  return {
    encoding: form.encoding,
    delimiter: form.delimiter,
    has_header_row: form.hasHeaderRow,
    skip_leading_lines: Number(form.skipLeadingLines),
    skip_trailing_lines: Number(form.skipTrailingLines),
    date_format: form.dateFormat,
    decimal_separator: form.decimalSeparator,
    thousands_separator: form.thousandsSeparator,
    amount_layout: form.amountLayout,
    ...(signed && form.positiveAmountMeans !== ""
      ? { positive_amount_means: form.positiveAmountMeans }
      : {}),
    columns,
  };
}

/** Whether two values save the same mapping. */
export function sameMapping(a: MappingForm, b: MappingForm): boolean {
  return JSON.stringify(csvMapping(a)) === JSON.stringify(csvMapping(b));
}

/**
 * Picks that name a column by header become positions in `headerRow` when the
 * file has no header row, and positions become that row's names when it has
 * one, so toggling the header row keeps every pick. A pick it can't match stays.
 */
export function rekeyColumns(
  columns: Record<ColumnField, ColumnKey>,
  headerRow: readonly string[],
  hasHeaderRow: boolean,
): Record<ColumnField, ColumnKey> {
  const names = headerRow.map((name) => name.trim().toLowerCase());
  return Object.fromEntries(
    columnFields.map((field) => {
      const key = columns[field];
      const column = parseColumnKey(key);
      if (hasHeaderRow && column !== undefined && "position" in column) {
        const name = headerRow[column.position - 1]?.trim() ?? "";
        return [field, name === "" ? key : headerKey(name)];
      }
      if (!hasHeaderRow && column !== undefined && "header" in column) {
        const index = names.indexOf(column.header.trim().toLowerCase());
        return [field, index === -1 ? key : positionKey(index + 1)];
      }
      return [field, key];
    }),
  ) as Record<ColumnField, ColumnKey>;
}

/**
 * The picks after the column `key` is picked for `field` (or for nothing): a
 * column holds one field, and a field reads one column.
 */
export function pickColumn(
  columns: Record<ColumnField, ColumnKey>,
  key: ColumnKey,
  field: ColumnField | undefined,
): Record<ColumnField, ColumnKey> {
  return Object.fromEntries(
    columnFields.map((candidate) => [
      candidate,
      candidate === field ? key : columns[candidate] === key ? "" : columns[candidate],
    ]),
  ) as Record<ColumnField, ColumnKey>;
}

/** A name for a new Connection: `base`, then "`base` 2", … whichever is free. */
export function freeConnectionName(base: string, taken: readonly string[]): string {
  const used = new Set(taken.map((name) => name.trim().toLowerCase()));
  for (let number = 1; ; number += 1) {
    const name = number === 1 ? base : `${base} ${String(number)}`;
    if (!used.has(name.toLowerCase())) {
      return name;
    }
  }
}

/** The editor's rule messages, each a key of the `connections` message file. */
export type RuleMessage =
  | "rules.nameRequired"
  | "rules.nameTooLong"
  | "rules.delimiter"
  | "rules.skipLeadingLines"
  | "rules.skipTrailingLines"
  | "rules.dateFormat"
  | "rules.decimalSeparator"
  | "rules.separatorsEqual"
  | "rules.amountLayout"
  | "rules.positiveAmountMeans"
  | "rules.columnRequired"
  | "rules.headerWithoutHeaderRow";

/**
 * The mapping's rules, checked on its fields before Save. `message` gives each
 * rule's words; `usedTwice` says a column is already read for another field.
 */
export function mappingSchema(
  message: (key: RuleMessage) => string,
  usedTwice: (other: ColumnField) => string,
) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, message("rules.nameRequired"))
        .max(100, message("rules.nameTooLong")),
      encoding: z.string(),
      delimiter: z.string().refine(isDelimiter, message("rules.delimiter")),
      hasHeaderRow: z.boolean(),
      skipLeadingLines: z.string().regex(/^\s*\d{1,4}\s*$/, message("rules.skipLeadingLines")),
      skipTrailingLines: z.string().regex(/^\s*\d{1,4}\s*$/, message("rules.skipTrailingLines")),
      dateFormat: z.string().min(1, message("rules.dateFormat")),
      decimalSeparator: z.string().min(1, message("rules.decimalSeparator")),
      thousandsSeparator: z.string(),
      amountLayout: z.string().min(1, message("rules.amountLayout")),
      positiveAmountMeans: z.string(),
      columns: z.record(z.enum(columnFields), z.string()),
    })
    .superRefine((form, context) => {
      if (form.thousandsSeparator !== "" && form.thousandsSeparator === form.decimalSeparator) {
        context.addIssue({
          code: "custom",
          path: ["thousandsSeparator"],
          message: message("rules.separatorsEqual"),
        });
      }
      if (form.amountLayout === "SIGNED" && form.positiveAmountMeans === "") {
        context.addIssue({
          code: "custom",
          path: ["positiveAmountMeans"],
          message: message("rules.positiveAmountMeans"),
        });
      }
      const required = requiredColumns(form.amountLayout);
      const seen = new Map<string, ColumnField>();
      for (const field of columnsFor(form.amountLayout)) {
        const key = form.columns[field];
        const column = parseColumnKey(key);
        const path = ["columns", field];
        if (column === undefined) {
          if (required.includes(field)) {
            context.addIssue({ code: "custom", path, message: message("rules.columnRequired") });
          }
          continue;
        }
        if ("header" in column && !form.hasHeaderRow) {
          context.addIssue({
            code: "custom",
            path,
            message: message("rules.headerWithoutHeaderRow"),
          });
          continue;
        }
        const same = "header" in column ? `h:${column.header.trim().toLowerCase()}` : key;
        const other = seen.get(same);
        if (other === undefined) {
          seen.set(same, field);
        } else {
          context.addIssue({
            code: "custom",
            path,
            message: usedTwice(other),
          });
        }
      }
    });
}
