import { describe, expect, it } from "vitest";

import {
  decodeSample,
  guessDateFormat,
  guessDecimalSeparator,
  guessDelimiter,
  guessEncoding,
  guessHeaderRow,
  guessSample,
  sampleTable,
  splitCsv,
} from "./csv-sample";

const bytes = (text: string) => new TextEncoder().encode(text);

/** `text` as UTF-16 in the given byte order; a byte order mark only if `text` starts with U+FEFF. */
function utf16(text: string, order: "little" | "big"): Uint8Array {
  const out = new Uint8Array(text.length * 2);
  const view = new DataView(out.buffer);
  for (let index = 0; index < text.length; index++) {
    view.setUint16(index * 2, text.charCodeAt(index), order === "little");
  }
  return out;
}

describe("the encoding", () => {
  it("is UTF-8 when the bytes are valid UTF-8", () => {
    expect(guessEncoding(bytes("Café;€3,50"))).toBe("UTF_8");
  });

  it("is Windows-1252 otherwise, decoded as the backend does", () => {
    // "Café;€3,50" in Windows-1252.
    const file = new Uint8Array([0x43, 0x61, 0x66, 0xe9, 0x3b, 0x80, 0x33, 0x2c, 0x35, 0x30]);
    expect(guessEncoding(file)).toBe("WINDOWS_1252");
    expect(decodeSample(file, "WINDOWS_1252")).toBe("Café;€3,50");
  });

  it("drops a UTF-8 byte order mark", () => {
    expect(decodeSample(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]), "UTF_8")).toBe("A");
  });

  it("is UTF-16 with a UTF-16 byte order mark, in either byte order", () => {
    const little = utf16("\ufeffCafé;€3,50", "little");
    const big = utf16("\ufeffCafé;€3,50", "big");
    expect(guessEncoding(little)).toBe("UTF_16");
    expect(guessEncoding(big)).toBe("UTF_16");
    expect(decodeSample(little, "UTF_16")).toBe("Café;€3,50");
    expect(decodeSample(big, "UTF_16")).toBe("Café;€3,50");
  });

  it("is UTF-16 with no byte order mark when most bytes of one parity are NUL", () => {
    // Plain ASCII in UTF-16 is valid UTF-8, so the NULs give it away.
    const file = utf16("16-11-2026;Coffee;-76.28\n", "little");
    expect(guessEncoding(file)).toBe("UTF_16");
    // Little-endian when there is no byte order mark, as the backend reads it.
    expect(decodeSample(file, "UTF_16")).toBe("16-11-2026;Coffee;-76.28\n");
  });
});

describe("splitting lines", () => {
  it("reads quoted cells, quotes in them and line breaks", () => {
    expect(splitCsv('a;"b;c";"say ""hi"""\r\n"two\nlines";x\n\n', ";")).toEqual([
      ["a", "b;c", 'say "hi"'],
      ["two\nlines", "x"],
    ]);
  });
});

describe("guessing", () => {
  it("the delimiter that splits lines evenly", () => {
    expect(guessDelimiter("Date;Text;Amount\n2026-01-02;Coffee, large;-3,50\n")).toBe(";");
    expect(guessDelimiter("Date,Text,Amount\n2026-01-02,Coffee,-3.50\n")).toBe(",");
    expect(guessDelimiter("Date\tText\tAmount\n2026-01-02\tCoffee\t-3.50\n")).toBe("\t");
  });

  it("the date format of the first column of dates, day first unless only month first reads", () => {
    expect(guessDateFormat([["2026-01-31", "x"]])).toBe("YYYY-MM-DD");
    expect(guessDateFormat([["x", "03/04/2026"]])).toBe("DD/MM/YYYY");
    expect(guessDateFormat([["03/04/2026"], ["12/31/2026"]])).toBe("MM/DD/YYYY");
    expect(guessDateFormat([["31.01.2026"]])).toBe("DD.MM.YYYY");
    expect(guessDateFormat([["20260131"]])).toBe("YYYYMMDD");
    expect(guessDateFormat([["Coffee"]])).toBeUndefined();
  });

  it("the decimal separator", () => {
    expect(guessDecimalSeparator([["-3,50"], ["1.234,50"]])).toBe(",");
    expect(guessDecimalSeparator([["-3.50"], ["1,234.50"]])).toBe(".");
    expect(guessDecimalSeparator([["12"]])).toBe(".");
  });

  it("a header row only when the next row has dates or amounts", () => {
    expect(
      guessHeaderRow([
        ["Date", "Amount"],
        ["2026-01-02", "-3.50"],
      ]),
    ).toBe(true);
    expect(
      guessHeaderRow([
        ["2026-01-01", "1.00"],
        ["2026-01-02", "-3.50"],
      ]),
    ).toBe(false);
  });

  it("all of it from a file", () => {
    const file = bytes(
      "Datum;Omschrijving;Bedrag\n31-01-2026;Albert Heijn;-23,40\n01-02-2026;Salaris;2.500,00\n",
    );
    expect(guessSample(file)).toEqual({
      encoding: "UTF_8",
      delimiter: ";",
      hasHeaderRow: true,
      dateFormat: "DD-MM-YYYY",
      decimalSeparator: ",",
    });
  });
});

describe("the sample's table", () => {
  const options = {
    encoding: "UTF_8",
    delimiter: ";",
    skipLeadingLines: 0,
    skipTrailingLines: 0,
    hasHeaderRow: false,
  };
  const line = (number: number, cells: string[], skipped = false) => ({
    line: number,
    cells,
    skipped,
  });

  it("shows the lines skipped at both ends, marked, with the header row and the rows between", () => {
    const file = bytes(
      "Bank export\nDate;Text\n2026-01-02;Coffee\n2026-01-03;Tea;extra\nTotal;-5,50\n\n  \n",
    );
    expect(
      sampleTable(file, {
        ...options,
        skipLeadingLines: 1,
        skipTrailingLines: 1,
        hasHeaderRow: true,
      }),
    ).toEqual({
      header: ["Date", "Text"],
      firstRow: ["Date", "Text"],
      rows: [
        line(1, ["Bank export"], true),
        line(3, ["2026-01-02", "Coffee"]),
        line(4, ["2026-01-03", "Tea", "extra"]),
        // Blank lines at the very end don't count as lines to skip.
        line(5, ["Total;-5,50"], true),
      ],
      // Skipped lines don't shape the columns.
      width: 3,
    });
  });

  it("shows the first and the last 10 rows, with the lines between as a gap", () => {
    const rows = Array.from({ length: 25 }, (_, index) => `2026-01-${String(index + 1)};Row`);
    const { rows: shown } = sampleTable(bytes(`${rows.join("\n")}\n`), options);
    expect(
      shown.map((entry) => ("gap" in entry ? `gap ${String(entry.gap)}` : entry.line)),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "gap 5", 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  });

  it("shows every row once, with no gap, when the two ends meet", () => {
    const rows = Array.from({ length: 20 }, (_, index) => `2026-01-${String(index + 1)};Row`);
    const { rows: shown } = sampleTable(bytes(rows.join("\r\n")), options);
    expect(shown.map((entry) => ("gap" in entry ? "gap" : entry.line))).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it("counts a quoted line break as a line, as the backend does", () => {
    const file = bytes('a;"two\nlines"\nb;c\n');
    expect(sampleTable(file, options).rows).toEqual([
      line(1, ["a", "two\nlines"]),
      line(3, ["b", "c"]),
    ]);
  });

  it("is empty when the lines skipped leave nothing to read", () => {
    const table = sampleTable(bytes("Bank export\nTotal\n"), {
      ...options,
      skipLeadingLines: 1,
      skipTrailingLines: 1,
    });
    expect(table).toMatchObject({ header: undefined, firstRow: [], width: 0 });
    expect(table.rows).toEqual([line(1, ["Bank export"], true), line(2, ["Total"], true)]);
  });
});
