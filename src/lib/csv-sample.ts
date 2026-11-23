// A sample statement file, read in the browser only to guess the mapping and
// to show the file as a table whose columns the User picks (spec, "CSV mapping
// editor"). How rows will read comes from the backend's test endpoint, never
// from here: nothing in this module reads a date or an amount for real.
import { choices, isDelimiter } from "./csv-mapping";

/** How many of the file's rows the editor shows and guesses from. */
export const sampleRowLimit = 10;

const bom = [0xef, 0xbb, 0xbf];

function withoutBom(bytes: Uint8Array): Uint8Array {
  return bom.every((byte, index) => bytes[index] === byte) ? bytes.subarray(3) : bytes;
}

/** UTF-8 when the bytes are valid UTF-8, else Windows-1252. */
export function guessEncoding(bytes: Uint8Array): "UTF_8" | "WINDOWS_1252" {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "UTF_8";
  } catch {
    return "WINDOWS_1252";
  }
}

/**
 * The file's text as the backend decodes it: a UTF-8 byte order mark dropped,
 * then Windows-1252 or (for any other encoding) UTF-8.
 */
export function decodeSample(bytes: Uint8Array, encoding: string): string {
  const label = encoding === "WINDOWS_1252" ? "windows-1252" : "utf-8";
  return new TextDecoder(label).decode(withoutBom(bytes));
}

/**
 * The file's lines split into cells at `delimiter`, as CSV: double quotes
 * enclose a cell (with `""` for a quote), and a line break inside quotes stays
 * in the cell. Blank lines are dropped. Reads at most `limit` rows.
 */
export function splitCsv(text: string, delimiter: string, limit = Infinity): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
    row = [];
    cell = "";
  };
  for (let i = 0; i < text.length && rows.length < limit; i += 1) {
    const char = text.charAt(i);
    if (quoted) {
      if (char === '"' && text.charAt(i + 1) === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text.charAt(i + 1) === "\n") {
        i += 1;
      }
      endRow();
    } else {
      cell += char;
    }
  }
  if ((cell !== "" || row.length > 0) && rows.length < limit) {
    endRow();
  }
  return rows;
}

/**
 * The delimiter among the editor's choices that splits the first lines into
 * the most rows of the same width, two columns or more; `;` when none does.
 */
export function guessDelimiter(text: string): string {
  let best = { delimiter: ";", score: 0 };
  for (const delimiter of choices.delimiter) {
    const rows = splitCsv(text, delimiter, 20);
    const widths = new Map<number, number>();
    for (const row of rows) {
      widths.set(row.length, (widths.get(row.length) ?? 0) + 1);
    }
    for (const [width, count] of widths) {
      // Rows of the same width count most; wider rows break ties.
      const score = width < 2 ? 0 : count * 100 + width;
      if (score > best.score) {
        best = { delimiter, score };
      }
    }
  }
  return best.delimiter;
}

const datePatterns: Record<string, RegExp> = {
  "YYYY-MM-DD": /^(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})$/,
  "YYYY/MM/DD": /^(?<y>\d{4})\/(?<m>\d{2})\/(?<d>\d{2})$/,
  YYYYMMDD: /^(?<y>(?:19|20)\d{2})(?<m>\d{2})(?<d>\d{2})$/,
  "DD/MM/YYYY": /^(?<d>\d{2})\/(?<m>\d{2})\/(?<y>\d{4})$/,
  "DD-MM-YYYY": /^(?<d>\d{2})-(?<m>\d{2})-(?<y>\d{4})$/,
  "DD.MM.YYYY": /^(?<d>\d{2})\.(?<m>\d{2})\.(?<y>\d{4})$/,
  "MM/DD/YYYY": /^(?<m>\d{2})\/(?<d>\d{2})\/(?<y>\d{4})$/,
  "MM-DD-YYYY": /^(?<m>\d{2})-(?<d>\d{2})-(?<y>\d{4})$/,
  "DD/MM/YY": /^(?<d>\d{2})\/(?<m>\d{2})\/(?<y>\d{2})$/,
  "MM/DD/YY": /^(?<m>\d{2})\/(?<d>\d{2})\/(?<y>\d{2})$/,
};

function readsAs(value: string, format: string): boolean {
  const groups = datePatterns[format]?.exec(value.trim())?.groups;
  if (groups === undefined) {
    return false;
  }
  const month = Number(groups["m"]);
  const day = Number(groups["d"]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/** Whether a cell looks like a date in any format the editor offers. */
export function looksLikeDate(value: string): boolean {
  return choices.date_format.some((format) => readsAs(value, format));
}

/**
 * The date format of the first column whose every value reads as one, in the
 * editor's order of formats (day first before month first); undefined when no
 * column is all dates.
 */
export function guessDateFormat(rows: readonly (readonly string[])[]): string | undefined {
  const width = Math.max(0, ...rows.map((row) => row.length));
  for (let column = 0; column < width; column += 1) {
    const values = rows.map((row) => row[column] ?? "").filter((value) => value.trim() !== "");
    if (values.length === 0) {
      continue;
    }
    const format = choices.date_format.find((candidate) =>
      values.every((value) => readsAs(value, candidate)),
    );
    if (format !== undefined) {
      return format;
    }
  }
  return undefined;
}

/** Whether a cell looks like an amount: digits, a sign, separators and nothing else. */
export function looksLikeAmount(value: string): boolean {
  const text = value.trim();
  return /\d/.test(text) && /^[+-]?[\d.,' ]+$/.test(text) && !looksLikeDate(text);
}

/**
 * The decimal separator of the amount-like cells: a comma when some end in a
 * comma and one or two digits and none in a point and one or two digits,
 * otherwise a point.
 */
export function guessDecimalSeparator(rows: readonly (readonly string[])[]): "." | "," {
  const amounts = rows.flat().filter(looksLikeAmount);
  const comma = amounts.some((value) => /,\d{1,2}$/.test(value.trim()));
  const point = amounts.some((value) => /\.\d{1,2}$/.test(value.trim()));
  return comma && !point ? "," : ".";
}

/**
 * Whether the first row names the columns: none of its cells looks like a date
 * or an amount, while the next row has one that does.
 */
export function guessHeaderRow(rows: readonly (readonly string[])[]): boolean {
  const [first, second] = rows;
  if (first === undefined || second === undefined) {
    return false;
  }
  const typed = (cell: string) => looksLikeDate(cell) || looksLikeAmount(cell);
  return !first.some(typed) && second.some(typed);
}

/** What the editor guesses from a sample file, to prefill its fields. */
export interface SampleGuess {
  encoding: "UTF_8" | "WINDOWS_1252";
  delimiter: string;
  hasHeaderRow: boolean;
  /** Undefined when no column reads as dates in a format the editor offers. */
  dateFormat: string | undefined;
  decimalSeparator: "." | ",";
}

/** Guesses the encoding, delimiter, header row, date format and decimal separator. */
export function guessSample(bytes: Uint8Array, skipLeadingLines = 0): SampleGuess {
  const encoding = guessEncoding(withoutBom(bytes));
  const text = skipLines(decodeSample(bytes, encoding), skipLeadingLines);
  const delimiter = guessDelimiter(text);
  const rows = splitCsv(text, delimiter, sampleRowLimit + 1);
  const hasHeaderRow = guessHeaderRow(rows);
  const data = hasHeaderRow ? rows.slice(1) : rows;
  return {
    encoding,
    delimiter,
    hasHeaderRow,
    dateFormat: guessDateFormat(data),
    decimalSeparator: guessDecimalSeparator(data),
  };
}

/** The text after its first `count` lines, as the backend skips them. */
export function skipLines(text: string, count: number): string {
  let rest = text;
  for (let i = 0; i < count; i += 1) {
    const end = rest.indexOf("\n");
    if (end === -1) {
      return "";
    }
    rest = rest.slice(end + 1);
  }
  return rest;
}

/** The sample as the editor shows it: its header row, if any, and its first rows. */
export interface SampleTable {
  /** The first row when the file has a header row; otherwise none. */
  header: string[] | undefined;
  rows: string[][];
  /** How many columns the widest row has. */
  width: number;
  /**
   * The first row whatever the header setting, so picks can move between
   * header names and positions.
   */
  firstRow: string[];
}

/** The sample's table for the editor's current encoding, delimiter, lines to skip and header row. */
export function sampleTable(
  bytes: Uint8Array,
  {
    encoding,
    delimiter,
    skipLeadingLines,
    hasHeaderRow,
  }: { encoding: string; delimiter: string; skipLeadingLines: number; hasHeaderRow: boolean },
): SampleTable {
  const text = skipLines(decodeSample(bytes, encoding), skipLeadingLines);
  const all = isDelimiter(delimiter)
    ? splitCsv(text, delimiter, sampleRowLimit + 1)
    : text
        .split(/\r?\n/)
        .filter((line) => line !== "")
        .slice(0, sampleRowLimit + 1)
        .map((line) => [line]);
  const firstRow = all[0] ?? [];
  const header = hasHeaderRow ? firstRow : undefined;
  const rows = (hasHeaderRow ? all.slice(1) : all).slice(0, sampleRowLimit);
  return {
    header,
    rows,
    firstRow,
    width: Math.max(0, ...all.map((row) => row.length)),
  };
}
