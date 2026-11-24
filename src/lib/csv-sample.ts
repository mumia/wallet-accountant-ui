// A sample statement file, read in the browser only to guess the mapping and
// to show the file as a table whose columns the User picks (spec, "CSV mapping
// editor"). How rows will read comes from the backend's test endpoint, never
// from here: nothing in this module reads a date or an amount for real.
import { choices, isDelimiter, type Encoding } from "./csv-mapping";

/** How many of the file's rows the editor shows and guesses from. */
export const sampleRowLimit = 10;

const startsWith = (bytes: Uint8Array, ...marker: number[]) =>
  marker.every((byte, index) => bytes[index] === byte);

function withoutBom(bytes: Uint8Array): Uint8Array {
  return startsWith(bytes, 0xef, 0xbb, 0xbf) ? bytes.subarray(3) : bytes;
}

const startsWithUtf16BigEndianBom = (bytes: Uint8Array) => startsWith(bytes, 0xfe, 0xff);
const startsWithUtf16Bom = (bytes: Uint8Array) =>
  startsWith(bytes, 0xff, 0xfe) || startsWithUtf16BigEndianBom(bytes);

/** How many of a file's first bytes the UTF-16 guess looks at. */
const utf16GuessBytes = 512;

/**
 * Whether most of the first bytes in odd or in even positions are NUL, as in
 * UTF-16 text that is mostly ASCII. Such text is also valid UTF-8. Big-endian
 * text with no byte order mark passes too, though it then reads as
 * little-endian, as in the backend.
 */
function looksLikeUtf16(bytes: Uint8Array): boolean {
  const pairs = Math.floor(Math.min(bytes.length, utf16GuessBytes) / 2);
  const nuls = [0, 0];
  for (let pair = 0; pair < pairs; pair++) {
    for (const half of [0, 1] as const) {
      if (bytes[pair * 2 + half] === 0) {
        nuls[half] = (nuls[half] ?? 0) + 1;
      }
    }
  }
  return pairs > 0 && Math.max(...nuls) * 2 > pairs;
}

/**
 * UTF-16 with a UTF-16 byte order mark or the NULs of UTF-16 text, else UTF-8
 * when the bytes are valid UTF-8, else Windows-1252.
 */
export function guessEncoding(bytes: Uint8Array): Encoding {
  if (startsWithUtf16Bom(bytes) || looksLikeUtf16(bytes)) {
    return "UTF_16";
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "UTF_8";
  } catch {
    return "WINDOWS_1252";
  }
}

/**
 * The file's text as the backend decodes it. UTF-16 takes its byte order from
 * its byte order mark, which is dropped, and is little-endian without one.
 * Otherwise a UTF-8 byte order mark is dropped, then Windows-1252 or (for any
 * other encoding) UTF-8. Bytes the backend would refuse are shown as best they
 * read: its mapping test says why the file is unreadable.
 */
export function decodeSample(bytes: Uint8Array, encoding: string): string {
  if (encoding === "UTF_16") {
    const label = startsWithUtf16BigEndianBom(bytes) ? "utf-16be" : "utf-16le";
    return new TextDecoder(label).decode(bytes);
  }
  const label = encoding === "WINDOWS_1252" ? "windows-1252" : "utf-8";
  return new TextDecoder(label).decode(withoutBom(bytes));
}

/** One CSV record of a text, and the lines it spans, from 0. */
export interface CsvRecord {
  line: number;
  lastLine: number;
  cells: string[];
}

/**
 * The text's records split into cells at `delimiter`, as CSV: double quotes
 * enclose a cell (with `""` for a quote), and a line break inside quotes stays
 * in the cell. Blank lines are dropped. Reads at most `limit` records. Lines
 * are counted at each `\n`, as the backend counts them.
 */
export function splitCsvRecords(text: string, delimiter: string, limit = Infinity): CsvRecord[] {
  const records: CsvRecord[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 0;
  let start = 0;
  const endRow = () => {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") {
      records.push({ line: start, lastLine: line, cells: row });
    }
    row = [];
    cell = "";
  };
  for (let i = 0; i < text.length && records.length < limit; i += 1) {
    const char = text.charAt(i);
    if (quoted) {
      if (char === '"' && text.charAt(i + 1) === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
        if (char === "\n") {
          line += 1;
        }
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      const crlf = char === "\r" && text.charAt(i + 1) === "\n";
      if (crlf) {
        i += 1;
      }
      endRow();
      if (char === "\n" || crlf) {
        line += 1;
      }
      start = line;
    } else {
      cell += char;
    }
  }
  if ((cell !== "" || row.length > 0) && records.length < limit) {
    endRow();
  }
  return records;
}

/** The text's rows split into cells at `delimiter`, as CSV (`splitCsvRecords`). */
export function splitCsv(text: string, delimiter: string, limit = Infinity): string[][] {
  return splitCsvRecords(text, delimiter, limit).map(({ cells }) => cells);
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
  encoding: Encoding;
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

/** A line of the sample as the editor shows it. */
export interface SampleLine {
  /** Its line in the file, from 1, as the backend counts lines. */
  line: number;
  /** Its cells; a skipped line is one cell, the whole line, since it isn't read. */
  cells: string[];
  /** A line skipped at the top or the bottom: shown, but never read. */
  skipped: boolean;
}

/** Lines of the file between two shown ones, not shown. */
export interface SampleGap {
  gap: number;
}

/**
 * The sample as the editor shows it: the lines skipped at the top, the first
 * rows, the last rows and the lines skipped at the bottom, with gaps for what
 * is left out between them. The header row, if any, is apart.
 */
export interface SampleTable {
  /** The first row when the file has a header row; otherwise none. */
  header: string[] | undefined;
  rows: (SampleLine | SampleGap)[];
  /** How many columns the widest row read has; skipped lines don't count. */
  width: number;
  /**
   * The first row read whatever the header setting, so picks can move between
   * header names and positions.
   */
  firstRow: string[];
}

/** The table's first row that will be read, below the header row. */
export function firstReadRow(table: SampleTable): SampleLine | undefined {
  return table.rows.find((row): row is SampleLine => "cells" in row && !row.skipped);
}

/** The file's physical lines, as the backend splits them: at `\n`, no empty last one. */
function physicalLines(text: string): string[] {
  if (text === "") {
    return [];
  }
  return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n");
}

interface Entry {
  line: number;
  lastLine: number;
  cells: string[];
  skipped: boolean;
  shown: boolean;
  /** The header row: kept for the gaps, shown apart. */
  header?: true;
}

/**
 * The sample's table for the editor's current encoding, delimiter, lines to
 * skip and header row. Lines are skipped as the backend skips them: the first
 * `skipLeadingLines`, then, after dropping blank lines at the very end, the
 * last `skipTrailingLines`.
 */
export function sampleTable(
  bytes: Uint8Array,
  {
    encoding,
    delimiter,
    skipLeadingLines,
    skipTrailingLines,
    hasHeaderRow,
  }: {
    encoding: string;
    delimiter: string;
    skipLeadingLines: number;
    skipTrailingLines: number;
    hasHeaderRow: boolean;
  },
): SampleTable {
  const lines = physicalLines(decodeSample(bytes, encoding));
  const top = Math.min(skipLeadingLines, lines.length);
  let end = lines.length;
  while (end > top && (lines[end - 1] ?? "").trim() === "") {
    end -= 1;
  }
  const bottom = Math.max(top, end - skipTrailingLines);

  const skippedEntry = (index: number, shown: boolean): Entry => ({
    line: index + 1,
    lastLine: index + 1,
    cells: [(lines[index] ?? "").replace(/\r$/, "")],
    skipped: true,
    shown,
  });

  const body = lines.slice(top, bottom).join("\n");
  const records = isDelimiter(delimiter)
    ? splitCsvRecords(body, delimiter)
    : body
        .split("\n")
        .map((text, index) => ({ line: index, lastLine: index, cells: [text.replace(/\r$/, "")] }))
        .filter(({ cells }) => cells[0] !== "");
  const read = records.map(({ line, lastLine, cells }): Entry => ({
    line: top + line + 1,
    lastLine: top + lastLine + 1,
    cells,
    skipped: false,
    shown: true,
  }));
  const [first] = read;
  const header = hasHeaderRow ? first : undefined;
  const data = hasHeaderRow ? read.slice(1) : read;
  data.forEach((entry, index) => {
    entry.shown = index < sampleRowLimit || index >= data.length - sampleRowLimit;
  });

  const entries: Entry[] = [
    ...Array.from({ length: top }, (_, index) =>
      skippedEntry(index, index >= top - sampleRowLimit),
    ),
    ...(header === undefined ? [] : [{ ...header, header: true as const }]),
    ...data,
    ...Array.from({ length: end - bottom }, (_, index) =>
      skippedEntry(bottom + index, index < sampleRowLimit),
    ),
  ];

  // Each run of entries left out becomes one gap, counting the file lines it spans.
  const rows: (SampleLine | SampleGap)[] = [];
  let lastShown = 0;
  let leftOut = false;
  for (const entry of entries) {
    if (!entry.shown) {
      leftOut = true;
      continue;
    }
    if (leftOut) {
      rows.push({ gap: entry.line - lastShown - 1 });
      leftOut = false;
    }
    lastShown = entry.lastLine;
    if (entry.header !== true) {
      rows.push({ line: entry.line, cells: entry.cells, skipped: entry.skipped });
    }
  }
  if (leftOut) {
    rows.push({ gap: end - lastShown });
  }

  return {
    header: header?.cells,
    rows,
    firstRow: first?.cells ?? [],
    width: Math.max(0, ...read.map(({ cells }) => cells.length)),
  };
}
