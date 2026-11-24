# 01: Skip lines at the bottom of a statement file

Status: resolved
Blocked by: —
Waits on backend: no. The release (v0.6.0) that adds `CsvMapping.skip_trailing_lines` and `CsvMappingTest.last_rows` (`../wallet-accountant/.scratch/csv-footer-lines/issues/01-skip-trailing-lines.md`).

## Why

Some banks end their exports with footer lines: totals, a closing balance. Today a footer line is an unreadable row, so the import is refused. The CSV mapping editor also never shows the end of the file: the sample table has the first 10 rows, and the mapping test has the first 10 readable rows. So the User can neither see the footer nor check that skipping it works.

## What to build

- [x] Move `src/api/CONTRACT_VERSION` to the release with `make contract-update ref=<tag>`.

### The mapping field

- [x] **Lines to skip at the bottom**, right after **Lines to skip at the top**.
  - Help text: "Lines after the last row, such as totals or a closing balance."
  - Same validation as the top: a whole number, 0 or more, defaulting to 0.
  - It reads and writes `skip_trailing_lines` (`src/lib/csv-mapping.ts`).
  - It is never guessed from the sample, like the top count.

### The sample table (raw cells, read in the browser; `src/lib/csv-sample.ts`, `src/features/connections/sample-table.tsx`)

- [x] **Line numbers:** a first column with each line's number in the file, counted as the backend counts them (from 1, skipped lines included).
- [x] **Both ends:** the first 10 rows after the lines skipped at the top, a gap row, then the last 10 non-empty rows of the file. The gap row spans all columns and says "⋯ N lines not shown", N being the file lines in between.
- [x] **Short files:** when the two ends overlap, every row is shown once, with no gap row.
- [x] **Skipped lines,** at the top and the bottom:
  - shown dimmed and marked "Skipped" (today the skipped top lines are hidden);
  - not counted toward either 10.
  
  The bottom is counted the way the backend counts it: blank or whitespace-only lines at the very end, and the final line break, don't count.
- [x] **Columns:** skipped lines are left out of the table's width and of the first row used for picking columns. Only lines that will be read shape the columns.
- [x] The table's caption no longer says "The first rows of …".

### The mapping test table

- [x] Show `rows`. When `last_rows` isn't empty, add a gap row "⋯ N rows not shown" (N = `readable_row_count` − `rows.length` − `last_rows.length`), then `last_rows`.
- [x] The summary line and caption say the table shows the first and last rows. It shows only the first when `last_rows` is empty.

### The mock

- [x] `src/mocks/statement-files.ts` skips trailing lines as the backend does: blank lines at the very end dropped, then the last N lines, before reading. This covers both the mapping test and import.
- [x] `src/mocks/csv-mapping-rules.ts` refuses a negative value with the backend's message.
- [x] The mock's mapping test returns `last_rows` as the contract describes. When the skipped lines leave nothing, the result is the existing empty-file problem.

### Tests

- [x] Unit tests (`csv-sample.test.ts`):
  - the windows at both ends, with line numbers;
  - the overlap on a short file;
  - skipped lines marked, at both ends, and left out of the width and the first row;
  - trailing blank lines not counted.
- [x] Unit tests for the mock's trailing skip and `last_rows`.
- [x] `connections` e2e, with a sample of more than 20 rows ending in a 2-line footer:
  - both ends and the gap show in the sample table;
  - with 0 lines skipped at the bottom, the mapping test lists the footer lines as unreadable;
  - set to 2, the footer is dimmed and "Skipped", and the mapping test reads the first and last rows with a "⋯ N rows not shown" gap.

### Done when

- [x] `make check` passes against the new contract

## Comments

- 2026-11-24, implementation notes:
  - `sampleTable` (`src/lib/csv-sample.ts`) builds the table from the whole decoded file. It skips lines as the backend's `skipLines` and `skipTrailingLines` do, and records come with their first and last file lines (`splitCsvRecords`). The rows are a list of lines (`line`, `cells`, `skipped`) and gaps; a gap stands only for entries left out, so a blank line in the middle never makes one.
  - A skipped line is shown whole, as one cell across the columns, since it isn't read as columns.
  - At most 10 skipped lines are shown at each end (the field takes up to 9999); any more fall into a gap.
  - The mock's `sampleRows` picks `rows` and `last_rows` as the backend's `ReadSample` does.
- 2026-11-24, after review:
  - The browser and the mock share `readRange` and `isBlankLine` (`src/lib/csv-sample.ts`), so the two can't skip lines differently. A blank line is one of only what Go's `unicode.IsSpace` calls space (U+0085 yes, U+FEFF no).
  - A lone `\r` ends a row in the sample table and counts as a line, so line numbers only go up. The backend can't read such a file, and the mapping test says so.
  - A gap row appears only when it stands for at least one line or row. So the mapping test has none for 11 to 20 readable rows, where `rows` and `last_rows` meet.
  - When the lines skipped leave nothing to read, the sample table still shows the skipped lines, under the "no rows after the lines skipped" message.
