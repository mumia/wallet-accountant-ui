# Connections and the CSV mapping editor

Status: done
Blocked by: 08
Waits on backend: yes. Needs Connection `name`, `CsvMapping.encoding`, the mapping test endpoint, and the `x-extensible-enum` contract changes. Start once a backend release tag carries them.

## What to build

- The Connections tab: each Connection by name with an "Import statement" row action that deep-links with `connection_id`.
- The full-page editor at `…/connections/new` and `…/connections/:connectionId`: every field in the spec, sample-file guessing in the browser, picking columns by clicking, "How rows will read" from the test endpoint, Zod rules before Save, a prompt before leaving with unsaved changes, and the "future imports only" note.
- Unit tests for the mapping rules, the sample-file guessing, and the choice labels against the contract enums.

## Acceptance criteria

- [x] E2e covers creating a Connection from a sample file, a rule error on a field, a server refusal, and editing an existing one. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 18–23; CSV mapping editor.

## Notes

- From ticket 08: `…/accounts/$accountId/connections/index.tsx` and `connections/new.tsx` are stubs; the getting-started checklist links to `connections/new`. Its step 1 shows "Connection created." without a name until the backend adds one.
- From ticket 12: Connection names come from one seam, `components/connection-names.ts` (`useConnectionNames`: "Connection 1", "Connection 2" by creation order). Swap its body for `name`, sorted by name. `connections/$connectionId.tsx` is a stub; the import flow links to it ("Edit" on a Connection without a mapping, "Edit the Connection's CSV mapping" on a refusal), and so does `connections/new` ("Create a Connection"). Both should return to `statement-imports/new` after Save. The Connections tab's "Import statement" row action uses `?connection_id=` (`newStatementImportSearch` in `lib/search.ts`).
- From ticket 15: The contract is pinned to v0.2.0 since ticket 15, which carries Connection `name`, `CsvMapping.encoding` (required in the generated type), the mapping test endpoint and Connection rename. The mock seeds names ("Card statements", "ING export", "Old export", "Savings statements") and `encoding: UTF_8`, but `components/connection-names.ts` still names Connections "Connection N": swap it for `name` and update the statement-import e2e. The backend at v0.2.0 answers 501 for the mapping test and Connection rename; its later commits still do.
- From ticket 17: The Statement imports tab exists (`features/statement-import/statement-imports-tab.tsx`), so the mapping editor's "Void its Statement import" note can link to it. The tab names Connections through `useConnectionNames` too, so the swap to `name` also changes `e2e/statement-imports.spec.ts` ("Connection 1€1,234.50").

## Answer

Landed on 2026-11-23, against backend v0.3.0 (`CONTRACT_VERSION`). Its `openapi.yaml` is byte for byte v0.2.0's. What changed is that the mapping test and Connection rename now work instead of answering 501.

- **Names**: `components/connection-names.ts` is no longer a seam. `connectionsByName` gives each Connection its `name`, sorted by name ignoring case. The import flow, the Statement imports tab and the getting-started checklist ("Connection created: Card statements.") use it. The statement-import e2e names Connections by their mock names.
- **Connections tab** (`features/connections/connections-tab.tsx`): Name, CSV mapping ("Statement file import" or "Needs a CSV mapping"), then Edit and "Import statement" (`?connection_id=`, only with a mapping), plus "New Connection". With none, an empty state links to the editor.
- **The editor** (`features/connections/connection-editor.tsx`, both routes): sections Name, Sample file, File, Dates and numbers, Amounts, Columns, How rows will read; then the "future imports" note (only when the Connection has Statement imports, linking to the tab), the form alert, Save and Cancel.
  - Choices are native selects (shadcn `native-select`, added with the `checkbox` part for the header row). A saved value the UI doesn't know is offered as it is.
  - Save creates with the mapping in one request. An edit sends `PATCH` only when the name changed and `PUT …/csv-mapping` only when the mapping changed (compared as the CsvMapping it writes). Afterwards the Connections list is read again, even after a failure, since a rename may have gone through before a refused mapping.
  - **Where it returns**: `?from=statement-import` goes back to `statement-imports/new?connection_id=<id>`, `?from=getting-started` to the Account. With no `from`, it returns to the Connections tab. The import flow's links and the checklist pass `from`, and Cancel goes to the same place.
  - **Leaving** with unsaved changes (RHF `isDirty`) asks first, through TanStack Router's `useBlocker` and a dialog (Stay / Leave), and on reload or tab close through `beforeunload`.
- **Pure modules**:
  - `lib/csv-mapping.ts`: the form model and its rules. Picks are keys, `h:<header>` or `p:<position>`. `csvMapping` writes `header` or `position` from them, and only the columns and sign the layout reads. `rekeyColumns` moves picks between header names and positions when the header row is toggled with a sample. `pickColumn` keeps one field per column. `mappingSchema` holds the Zod rules: required columns per layout, a column used twice, a header pick without a header row, equal separators, the name 1–100, one delimiter character, lines to skip, the date format and the sign.
  - `lib/csv-sample.ts`: decoding (UTF-8 when valid, else Windows-1252, BOM dropped), a quote-aware split for showing the table, and the guesses: delimiter, header row, date format (first all-date column, day first unless only month first reads) and decimal separator. It never reads amounts or dates for real.
- **Column picking**: every column header in the sample table is a menu button ("What column 2 holds: Description"). Picking moves the field to that column and frees the one it had. The Base UI radio items need `closeOnClick` to close the menu. The column dropdowns work without a sample: they offer the saved header names and "Column 1…12".
- **How rows will read** (`mapping-test.tsx`): it checks the mapping's fields first, then sends the multipart test (`csv_mapping` as JSON text). It shows "N rows read", the first rows (Transaction date, Value date, payee and bank ID columns only when present), and up to 20 unreadable lines with a count of the rest. It marks the reading as stale once the mapping changes.
- **Mock**: `mocks/connection-handlers.ts` handles list, create, rename, save mapping and test with the backend's checks and problems. `mocks/csv-mapping-rules.ts` ports `Validate` word for word. `mocks/statement-files.ts` now reads every contract date format, debit/credit, Transaction and Value dates and payee. The mapping test decodes Windows-1252 too; preview and upload still read files as UTF-8.
- **Tests**: unit tests for the rules, reading and writing, re-keying, the free name and the sample guesses. A contract test checks the choices against `CsvMapping`'s six enums (`propertyEnum` in `src/test/contract.ts`). A component test covers column picking by keyboard. `e2e/connections.spec.ts` covers the tab, creating from a sample (guesses, picking, an unreadable line, then a read that's stale and is read again), field rules, the leave prompt, a duplicate-name refusal, a rename that leaves the mapping alone, and the return to the import flow, with axe at each state.
- **A contrast catch**: an invalid field turns its text destructive. On a native select's hover background in dark Ledger, that drops to 3.9:1, so the editor's selects keep `text-foreground` and the error message carries the red.

