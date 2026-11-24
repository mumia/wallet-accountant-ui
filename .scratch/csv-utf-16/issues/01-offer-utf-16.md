# 01: Offer the UTF-16 encoding in the CSV mapping editor

Status: resolved
Blocked by: —
Waits on backend: no. v0.5.0 adds `UTF_16` to `CsvMapping.encoding` (`../wallet-accountant/.scratch/csv-utf-16/issues/01-utf-16-encoding.md`).

## Why

A User's sample was UTF-16, but the editor guessed Windows-1252. Neither the contract nor the UI knows UTF-16 yet. `guessEncoding` (`src/lib/csv-sample.ts`) tries UTF-8 and otherwise falls back to Windows-1252. A UTF-16 file with characters outside ASCII isn't valid UTF-8, so it ends up as Windows-1252. The backend's mapping test then reports every date and amount with a NUL byte beside each character (`"\x001\x006\x00-…"`). A UTF-16 file of plain ASCII *is* valid UTF-8, NULs included, so it would be guessed as UTF-8 and fail the same way.

## What to build

- [x] Move `src/api/CONTRACT_VERSION` to the backend release with `make contract-update ref=<tag>`.
- [x] Add `UTF_16` to `choices.encoding` in `src/lib/csv-mapping.ts`. Its test against the contract's `x-extensible-enum` fails until you do. Give it a label in `choice-labels.ts` and the locale: "UTF-16".
- [x] `guessEncoding` returns `UTF_16`:
  - for a UTF-16 byte order mark (`FF FE` or `FE FF`);
  - for no BOM but NUL bytes in most of either the odd or the even positions of the first few hundred bytes.
  
  It does this before the UTF-8 check. Otherwise it behaves as today.
- [x] `decodeSample` decodes `UTF_16` as the backend does: the byte order from the BOM, which is dropped, and little-endian without one. `TextDecoder("utf-16le" | "utf-16be")` does this.
- [x] The mock decodes `UTF_16` the same way (`src/mocks/statement-files.ts`, `decodeStatementFile`). Its encoding check (`src/mocks/csv-mapping-rules.ts`) accepts `UTF_16`.
- [x] Tests:
  - `csv-sample.test.ts`: the guess for UTF-16LE with a BOM, UTF-16BE with a BOM, and UTF-16LE with no BOM; decoding of each;
  - the `connections` e2e: a UTF-16 sample is guessed as UTF-16, and its rows read in the mapping test.

### Done when

- [x] `make check` passes against the new contract
