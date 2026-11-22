# Statement imports tab and Void

Status: open
Blocked by: 08, 12
Waits on backend: yes. Needs `void_blocked_by` on StatementImport.

## What to build

- The Statement imports tab: every import across the Account's Connections, newest first, with the Balance check badge, voided imports muted, and `statement_import_id` highlighting one.
- Void, enabled only when `void_blocked_by` is empty (otherwise the reason and a fix link), with the dialog wording from the spec and a toast with **Import statement** afterwards.

## Acceptance criteria

- [ ] E2e covers Void allowed, Void blocked, and the highlighted import. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 43; Months, Month close, Reverse and Void (Statement imports tab).

## Notes

- From ticket 08: `…/accounts/$accountId/statement-imports/index.tsx` is a stub.
- From ticket 12: `statement-imports/index.tsx` validates `statementImportsSearch` (`statement_import_id`); the import flow's "See the earlier import" links with it. `useLatestImportConnection` in `features/statement-import/statement-import-query.ts` reads each Connection's imports, and the mock serves `listStatementImports`.
