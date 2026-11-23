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
  const file = bytes("Bank export\nDate;Text\n2026-01-02;Coffee\n2026-01-03;Tea;extra\n");

  it("skips lines and takes the header row", () => {
    expect(
      sampleTable(file, {
        encoding: "UTF_8",
        delimiter: ";",
        skipLeadingLines: 1,
        hasHeaderRow: true,
      }),
    ).toEqual({
      header: ["Date", "Text"],
      firstRow: ["Date", "Text"],
      rows: [
        ["2026-01-02", "Coffee"],
        ["2026-01-03", "Tea", "extra"],
      ],
      width: 3,
    });
  });
});
