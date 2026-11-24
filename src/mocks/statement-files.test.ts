import { describe, expect, it } from "vitest";

import { decodeStatementFile } from "./statement-files";

const file = (...bytes: number[]) => new Uint8Array(bytes).buffer;

// As the backend's Encoding.decode (internal/ingestion/domain/encoding.go, v0.5.0).
describe("a statement file's bytes", () => {
  it("are UTF-16 in the byte order of their byte order mark, which is dropped", () => {
    expect(decodeStatementFile(file(0xff, 0xfe, 0xe9, 0x00, 0xac, 0x20), "UTF_16")).toEqual({
      text: "é€",
    });
    expect(decodeStatementFile(file(0xfe, 0xff, 0x00, 0xe9, 0x20, 0xac), "UTF_16")).toEqual({
      text: "é€",
    });
  });

  it("are little-endian UTF-16 with no byte order mark", () => {
    expect(decodeStatementFile(file(0x41, 0x00, 0x42, 0x00), "UTF_16")).toEqual({ text: "AB" });
  });

  it("are unreadable as UTF-16 when there is an odd number of them", () => {
    expect(decodeStatementFile(file(0x41, 0x00, 0x42), "UTF_16")).toEqual({
      unreadable: "the file has an odd number of bytes, so it is not UTF-16",
    });
  });

  it("are unreadable under another encoding when they start with a UTF-16 byte order mark", () => {
    for (const encoding of ["UTF_8", "WINDOWS_1252", undefined]) {
      expect(decodeStatementFile(file(0xff, 0xfe, 0x41, 0x00), encoding)).toEqual({
        unreadable:
          "the file starts with a UTF-16 byte order mark; set the mapping's encoding to UTF-16",
      });
    }
  });

  it("lose a UTF-8 byte order mark under UTF-8 or Windows-1252", () => {
    expect(decodeStatementFile(file(0xef, 0xbb, 0xbf, 0x41), "UTF_8")).toEqual({ text: "A" });
    expect(decodeStatementFile(file(0xef, 0xbb, 0xbf, 0x80), "WINDOWS_1252")).toEqual({
      text: "€",
    });
  });
});
