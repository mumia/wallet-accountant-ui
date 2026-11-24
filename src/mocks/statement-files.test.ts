import { describe, expect, it } from "vitest";

import { decodeStatementFile, parseStatementFile } from "./statement-files";

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
