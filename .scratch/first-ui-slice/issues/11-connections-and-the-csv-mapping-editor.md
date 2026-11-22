# Connections and the CSV mapping editor

Status: open
Blocked by: 08
Waits on backend: yes. Needs Connection `name`, `CsvMapping.encoding`, the mapping test endpoint, and the `x-extensible-enum` contract changes. Start once a backend release tag carries them.

## What to build

- The Connections tab: each Connection by name with an "Import statement" row action that deep-links with `connection_id`.
- The full-page editor at `…/connections/new` and `…/connections/:connectionId`: every field in the spec, sample-file guessing in the browser, picking columns by clicking, "How rows will read" from the test endpoint, Zod rules before Save, a prompt before leaving with unsaved changes, and the "future imports only" note.
- Unit tests for the mapping rules, the sample-file guessing, and the choice labels against the contract enums.

## Acceptance criteria

- [ ] E2e covers creating a Connection from a sample file, a rule error on a field, a server refusal, and editing an existing one. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 18–23; CSV mapping editor.

## Notes

- From ticket 08: `…/accounts/$accountId/connections/index.tsx` and `connections/new.tsx` are stubs; the getting-started checklist links to `connections/new`. Its step 1 shows "Connection created." without a name until the backend adds one.
- From ticket 12: Connection names come from one seam, `components/connection-names.ts` (`useConnectionNames`: "Connection 1", "Connection 2" by creation order). Swap its body for `name`, sorted by name. `connections/$connectionId.tsx` is a stub; the import flow links to it ("Edit" on a Connection without a mapping, "Edit the Connection's CSV mapping" on a refusal), and so does `connections/new` ("Create a Connection"). Both should return to `statement-imports/new` after Save. The Connections tab's "Import statement" row action uses `?connection_id=` (`newStatementImportSearch` in `lib/search.ts`).
- From ticket 15: The contract is pinned to v0.2.0 since ticket 15, which carries Connection `name`, `CsvMapping.encoding` (required in the generated type), the mapping test endpoint and Connection rename. The mock seeds names ("Card statements", "ING export", "Old export", "Savings statements") and `encoding: UTF_8`, but `components/connection-names.ts` still names Connections "Connection N": swap it for `name` and update the statement-import e2e. The backend at v0.2.0 answers 501 for the mapping test and Connection rename; its later commits still do.
