import { describe, expect, it } from "vitest";

import {
  fileBalanceOf,
  collectStatementFile,
  decodeStatementFile,
  parseStatementFile,
  sampleRows,
} from "./statement-files";

const file = (...bytes: number[]) => new Uint8Array(bytes).buffer;

// As the backend's Encoding.decode (internal/ingestion/domain/encoding.go, v0.5.0).
describe("a statement file's bytes", () => {
  it("are UTF-16 in the byte order of their byte order mark, which is dropped", () => {
    expect(decodeStatementFile(file(0xff, 0xfe, 0xe9, 0x00, 0xac, 0x20), "UTF_16")).toEqual({
      kind: "text",
      text: "é€",
    });
    expect(decodeStatementFile(file(0xfe, 0xff, 0x00, 0xe9, 0x20, 0xac), "UTF_16")).toEqual({
      kind: "text",
      text: "é€",
    });
  });

  it("are little-endian UTF-16 with no byte order mark", () => {
    expect(decodeStatementFile(file(0x41, 0x00, 0x42, 0x00), "UTF_16")).toEqual({
      kind: "text",
      text: "AB",
    });
  });

  it("are unreadable as UTF-16 when there is an odd number of them", () => {
    expect(decodeStatementFile(file(0x41, 0x00, 0x42), "UTF_16")).toEqual({
      kind: "unreadable",
      reason: "the file has an odd number of bytes, so it is not UTF-16",
    });
  });

  it("are unreadable under another encoding when they start with a UTF-16 byte order mark", () => {
    for (const encoding of ["UTF_8", "WINDOWS_1252", undefined]) {
      expect(decodeStatementFile(file(0xff, 0xfe, 0x41, 0x00), encoding)).toEqual({
        kind: "unreadable",
        reason:
          "the file starts with a UTF-16 byte order mark; set the mapping's encoding to UTF-16",
      });
    }
  });

  it("lose a UTF-8 byte order mark under UTF-8 or Windows-1252", () => {
    expect(decodeStatementFile(file(0xef, 0xbb, 0xbf, 0x41), "UTF_8")).toEqual({
      kind: "text",
      text: "A",
    });
    expect(decodeStatementFile(file(0xef, 0xbb, 0xbf, 0x80), "WINDOWS_1252")).toEqual({
      kind: "text",
      text: "€",
    });
  });
});

describe("parsing a statement file", () => {
  const mapping = {
    encoding: "UTF_16",
    delimiter: ";",
    has_header_row: false,
    date_format: "DD-MM-YYYY",
    decimal_separator: ",",
    amount_layout: "SIGNED",
    columns: {
      booking_date: { position: 1 },
      description: { position: 2 },
      amount: { position: 3 },
    },
  } as const;

  it("decodes it with the mapping's encoding first", () => {
    const text = "\ufeff16-11-2026;Café;-76,28\n";
    const bytes = new Uint8Array(text.length * 2);
    for (let index = 0; index < text.length; index++) {
      new DataView(bytes.buffer).setUint16(index * 2, text.charCodeAt(index), true);
    }
    const { rows, errors } = parseStatementFile(bytes.buffer, mapping, 2);
    expect(errors).toEqual([]);
    expect(rows).toMatchObject([
      { bookingDate: "2026-11-16", description: "Café", amount: "-76.28" },
    ]);
  });

  it("is one unreadable line, 1, when the encoding can't read it", () => {
    expect(parseStatementFile(file(0x41, 0x00, 0x42), mapping, 2)).toEqual({
      rows: [],
      errors: [{ line: 1, reason: "the file has an odd number of bytes, so it is not UTF-16" }],
    });
  });
});

describe("lines skipped at the bottom", () => {
  const mapping = {
    delimiter: ";",
    has_header_row: true,
    skip_leading_lines: 1,
    date_format: "DD-MM-YYYY",
    decimal_separator: ",",
    amount_layout: "SIGNED",
    columns: {
      booking_date: { header: "Date" },
      description: { header: "Text" },
      amount: { header: "Amount" },
    },
  } as const;
  const file = [
    "Bank export",
    "Date;Text;Amount",
    "16-11-2026;Coffee;-3,50",
    "17-11-2026;Tea;-2,00",
    "Total;;-5,50",
    "Closing balance;;100,00",
    "",
    "   ",
    "",
  ].join("\n");

  it("are read as rows when none are skipped, with their lines", () => {
    expect(collectStatementFile(file, mapping, 2).errors.map(({ line }) => line)).toEqual([5, 6]);
  });

  it("are dropped, not counting blank lines at the very end", () => {
    const { rows, errors } = collectStatementFile(file, { ...mapping, skip_trailing_lines: 2 }, 2);
    expect(errors).toEqual([]);
    expect(rows.map(({ line, description }) => `${String(line)} ${description}`)).toEqual([
      "3 Coffee",
      "4 Tea",
    ]);
  });

  it("leave no rows when they cover the file", () => {
    expect(collectStatementFile(file, { ...mapping, skip_trailing_lines: 9 }, 2)).toEqual({
      rows: [],
      errors: [],
    });
  });
});

describe("the mapping test's rows", () => {
  const rows = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

  it("are the first 10, then the last 10 not already shown", () => {
    expect(sampleRows(rows(5))).toEqual({ first: rows(5), last: [] });
    expect(sampleRows(rows(15))).toEqual({ first: rows(10), last: [11, 12, 13, 14, 15] });
    expect(sampleRows(rows(30))).toEqual({ first: rows(10), last: rows(30).slice(20) });
  });
});

describe("the balance column", () => {
  const mapping = {
    delimiter: ";",
    has_header_row: true,
    date_format: "DD-MM-YYYY",
    decimal_separator: ".",
    amount_layout: "SIGNED",
    columns: {
      booking_date: { header: "Date" },
      description: { header: "Text" },
      amount: { header: "Amount" },
      balance: { header: "Balance" },
    },
  } as const;
  const read = (...rows: string[]) =>
    collectStatementFile(["Date;Text;Amount;Balance", ...rows].join("\n"), mapping, 2);

  it("is read on each row", () => {
    expect(read("16-11-2026;Coffee;-3.5;96.50").rows[0]?.balance).toBe("96.50");
  });

  it("makes a row unreadable when it isn't a number, as the backend says", () => {
    expect(read("16-11-2026;Coffee;-3.50;", "17-11-2026;Tea;-2.00;lots").errors).toEqual([
      { line: 2, reason: "the balance is blank" },
      { line: 3, reason: 'the balance "lots" is not a number' },
    ]);
  });
});

describe("the file's balance", () => {
  const row = (line: number, amount: string, balance: string) => ({ line, amount, balance });

  it("is the last row's when the rows are oldest first", () => {
    expect(
      fileBalanceOf([
        row(2, "-3.00", "97.00"),
        row(3, "-2.00", "95.00"),
        row(4, "10.00", "105.00"),
      ]),
    ).toEqual({ amount: "105.00", line: 4 });
  });

  it("is the first row's when the rows are newest first, as Millennium BCP's are", () => {
    expect(
      fileBalanceOf([
        row(14, "-76.28", "8758.21"),
        row(15, "-56.00", "8834.49"),
        row(16, "-8.60", "8890.49"),
      ]),
    ).toEqual({ amount: "8758.21", line: 14 });
  });

  it("is the only row's in a file of one", () => {
    expect(fileBalanceOf([row(2, "-3.00", "97.00")])).toEqual({ amount: "97.00", line: 2 });
  });

  it("can't be worked out when the balances don't add up", () => {
    expect(fileBalanceOf([row(2, "-3.00", "97.00"), row(3, "-2.00", "90.00")])).toEqual({
      problem: "the balance column doesn't add up from one end of the file to the other",
    });
  });

  it("can't be worked out when the balances add up both ways to different balances", () => {
    expect(fileBalanceOf([row(2, "10.00", "110.00"), row(3, "-10.00", "100.00")])).toEqual({
      problem:
        "the balance column adds up from both ends of the file, so its newest row can't be told",
    });
  });
});
