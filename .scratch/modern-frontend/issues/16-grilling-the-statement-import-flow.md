# Grilling: the Statement import flow

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 12, 13, 15

## Question

How does each step of the Statement import flow work in detail?

The steps are fixed in [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md) and were prototyped in [Prototype: look and feel](09-prototype-look-and-feel.md). Decide: choosing or creating the Connection inline; the file picker; typing the Export balance twice on the first import (and what a mismatch looks like); the Opening balance preview and Confirm; the result screen; and how each refusal from the API (bad file, mapping mismatch, overlapping import, …) reads.

## Comments

**2026-11-20, from [Grilling: the CSV mapping editor](15-grilling-the-csv-mapping-editor.md):** Connections get a required name (⚠️ backend), so the Choose-the-Connection step lists them by name. "Create one" opens the full-page mapping editor, which returns to this flow after Save. Files may be Windows-1252 once the mapping carries an encoding.

## Answer

Decided with the user on 2026-11-20, against `../wallet-accountant/api/openapi.yaml` (`previewStatementImport`, `uploadStatementImport`, `StatementFileProblem`, `StatementImportConflictProblem`) and the prototype (`prototypes/look-and-feel/shadcn/src/statement-import.tsx` on branch `prototype/look-and-feel`, commit `3da18dd`). Facts: the contract sets no file size limit; the backend caps request bodies at 64 MiB. The steps stay as prototyped: a stepper, one card per step.

### 1. Choose the Connection

- **One** usable Connection: step skipped. **Several**: radio list by name, preselecting the Connection of the Account's latest Statement import, else the first by name.
- **None**: "This Account has no Connection yet" with "Create a Connection", which opens the full-page mapping editor and returns here after Save.
- **Deep link**: `statement-imports/new?connection_id=…` skips the step; the file step shows the Connection's name with a "Change" link. The Connections tab gets an "Import statement" row action using it.
- A Connection **without a CSV mapping** (possible through the API only) is listed disabled with "Needs a CSV mapping — Edit".

### 2. File and Export balance

- **File**: drop zone that also opens the chooser, showing name and size, with "Replace file". `accept=".csv,.txt,text/csv,text/plain"` is a hint only; any file can be picked. The browser refuses only an empty file. No size limit of ours (a body over the backend's cap gets the generic error). No row preview here.
- **Export balance** (the glossary's meaning, not "closing balance on the statement"): help text "Your bank's booked balance when you exported this file, in {currency}. Leave out card payments still marked as pending." Negative allowed. The amount input from [Grilling: exact money in the browser](06-grilling-exact-money-in-the-browser.md).
- **First import only**: a second field, "Export balance, again", explaining it sets the Opening balance. **Pasting is blocked in that second field** (the first allows it); the user chose this over the accessibility trade-off raised. A mismatch shows on the second field ("The two Export balances differ") on blur or on Preview, via Zod, never while typing. A server `export-balance-mismatch` falls back to the generic form alert.
- The button reads **Preview** on a first import, **Import** otherwise.

### 3. Opening balance preview (first import only)

- As prototyped: the Opening balance on the start date, large, with "= Export balance − rows total"; stats for rows to import, ignored before the start date, rows total; Back and "Confirm and import".
- Added: the file name and Connection name; when `row_count` is 0, a warning "No rows on or after the start date: the Opening balance equals the Export balance" (Confirm still allowed); when rows were ignored, a note that they are before the Account's start date of {date}.
- File and balances live in page memory: Back keeps them, a reload starts over. Preview and Confirm each get their own Idempotency-Key through the write wrapper.

### 4. Result

- "Statement imported", the Balance check badge, stats: Imported, Skipped as certain repeats, Suspected duplicates, Ignored before the start date; on a first import also the Opening balance recorded.
- `WAITING` reads "Waiting — decide the Suspected duplicates to finish the Balance check".
- Main button "Review N rows" → To review without a month; with Suspected duplicates it goes to To review with `state=SUSPECTED_DUPLICATE`. A secondary "Back to the Account".
- `rows_imported` = 0: "Nothing new in this file", no review button.
- The result is page state only; a reload loses it, and the Statement imports tab shows the same counts.
- After success the Account, Accounts overview, To review and Statement imports reads are invalidated (Notifications refetch at ~3 s and ~10 s as already decided).

### Refusals

- Shown as the form alert of the step that sent the request (file step for preview and later upload, preview step for Confirm), keeping the file and balances. A refusal on Confirm also offers "Back to the file".
- Rendered by **which fields the problem carries**, never by `type` (no list of problem types in the UI):
  - `rows`: `title` + `detail`, a Line | Reason table of the first 20 with "and N more", and "Edit the Connection's CSV mapping" (returns to the flow).
  - `expected_balance` / `export_balance` / `difference`: those three amounts, then a fixed hint from our message files: mistyped Export balance, a pending card payment counted in, a gap since the last import, or the amount sign inverted in the mapping. Links to the mapping editor and the Statement imports tab.
  - `statement_import_id`: "See the earlier import" → the Statement imports tab with `?statement_import_id=` highlighting it.
  - Anything else (`preview-mismatch`, `opening-balance-already-recorded`, `empty-statement-file`, `invalid-export-balance`, `csv-mapping-required`): `title` + `detail` only. On `opening-balance-already-recorded` the User goes Back and imports again; the flow then treats it as a later import. No special action.

No backend changes.
