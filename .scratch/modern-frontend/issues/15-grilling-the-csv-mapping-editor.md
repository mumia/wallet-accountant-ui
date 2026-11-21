# Grilling: the CSV mapping editor

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 12, 13

## Question

How does a User create and edit a Connection's CSV mapping?

From the backend's Connection and CSV mapping model: which fields the editor asks for (columns, date and number formats, sign convention, …), whether it previews a sample file to pick columns from, how validation errors from the API are shown, and what editing a mapping that has already imported statements means for the User.

## Answer

Decided with the user on 2026-11-20, against `../wallet-accountant/api/openapi.yaml` and `internal/ingestion/domain/csvmapping.go`. Facts from the backend: a Connection has an id, a kind (only `STATEMENT_FILE_IMPORT` is accepted) and an optional CSV mapping; saving a mapping replaces it whole and bumps `csv_mapping_version`, to which a first import's preview is tied; a refused mapping is one 422 `/problems/invalid-csv-mapping` whose `detail` lists every problem as text; a mapping is only exercised by uploading a statement file; files are read as UTF-8 (a BOM is stripped).

### Creating and editing

- "New Connection" (`…/connections/new`) is the full-page mapping editor; Save creates the Connection **with** its mapping in one request. The UI never creates a Connection without a mapping. No kind picker.
- After Save the User returns where they came from: the Connections tab, or the Statement import flow that sent them here.
- Editing (`…/connections/:connectionId`) is the same page, also used to rename the Connection.
- Leaving the page with unsaved changes asks first.

### Fields

- **Name**: required, prefilled "Statement file" (then "Statement file 2", …) ⚠️ backend.
- **File**: encoding (UTF-8 or Windows-1252) ⚠️ backend, delimiter, header row, lines to skip.
- **Dates and numbers**: date format, decimal separator, thousands separator.
- **Amounts**: amount layout (one signed column, or debit and credit columns); for a signed amount, whether positive means money in or money out.
- **Columns**: Booking date, description, amount (or debit and credit) required; Transaction date, Value date, payee, bank transaction ID optional.
- **Header or position is never asked**: the editor writes `header` when the file has a header row and `position` otherwise. The User just picks a column.
- Choice labels live in the UI's message files, with a test that the known values match the contract's enums; a saved value the UI doesn't know is shown as-is.

### Sample file

- The User may open a sample statement file. The browser reads it locally to guess encoding (UTF-8 when valid, else Windows-1252), delimiter, header row, date format and decimal separator, prefilling the form, and shows it as a table whose columns are picked by clicking (dropdowns work without a sample). Changing the encoding or delimiter redraws the table.
- "How rows will read" comes from the backend, never from a second parser in the browser: a new test endpoint takes the unsaved mapping and the sample and returns the first rows as the backend reads them, or the unreadable lines with reasons ⚠️ backend. The sample is not stored.

### Errors

- Zod mirrors the mapping rules so problems show on their fields before Save: required columns for the chosen amount layout, a column used twice, a header column without a header row, thousands separator equal to the decimal separator, name blank or too long.
- A server refusal that still gets through (including a duplicate name) shows as the form alert with the problem's `title` and `detail`, per [Grilling: talking to the API](12-grilling-talking-to-the-api.md).

### Editing a mapping that has imported statements

Saving applies to future imports only. When the Connection has Statement imports, a note above Save reads "Changes apply to future imports. To re-read a file already imported, Void its Statement import and import it again", linking to the Statement imports tab. No confirmation, no blocking.

## Backend changes

1. **Connection name**: a required `name` on Connection (1–100 characters, trimmed, unique within the Account ignoring case), set on create and renameable (a `PATCH` on the Connection or a field on save, the backend's choice). Duplicate names refused with a 422 problem.
2. **Mapping encoding**: an `encoding` field on `CsvMapping`, `x-extensible-enum` of `UTF-8` and `WINDOWS-1252` (exact spelling the backend's choice); absent means UTF-8 so saved mappings stay valid; the file is decoded before parsing.
3. **Mapping test endpoint**: e.g. `POST /households/{household_id}/accounts/{account_id}/csv-mapping-tests`, multipart with an unsaved mapping and a sample file; returns the first ~10 rows as parsed, or the unreadable lines with reasons in the same `rows` shape as `/problems/unreadable-statement-file`; an invalid mapping gets `/problems/invalid-csv-mapping`. Records nothing.
4. **Contract only**: `date_format`, `decimal_separator` and `thousands_separator` listed as `x-extensible-enum` instead of only in prose.
