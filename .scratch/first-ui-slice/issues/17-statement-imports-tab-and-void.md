# Statement imports tab and Void

Status: done
Blocked by: 08, 12
Waits on backend: yes. Needs `void_blocked_by` on StatementImport.

## What to build

- The Statement imports tab: every import across the Account's Connections, newest first, with the Balance check badge, voided imports muted, and `statement_import_id` highlighting one.
- Void, enabled only when `void_blocked_by` is empty (otherwise the reason and a fix link), with the dialog wording from the spec and a toast with **Import statement** afterwards.

## Acceptance criteria

- [x] E2e covers Void allowed, Void blocked, and the highlighted import. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 43; Months, Month close, Reverse and Void (Statement imports tab).

## Notes

- From ticket 08: `…/accounts/$accountId/statement-imports/index.tsx` is a stub.
- From ticket 12: `statement-imports/index.tsx` validates `statementImportsSearch` (`statement_import_id`); the import flow's "See the earlier import" links with it. `useLatestImportConnection` in `features/statement-import/statement-import-query.ts` reads each Connection's imports, and the mock serves `listStatementImports`.
- From ticket 15: The contract is pinned to v0.2.0 since ticket 15, with `void_blocked_by`. The mock computes it on `listStatementImports` (`voidBlockedBy` in `src/mocks/months.ts`). Savings (new seed Account) has one first import whose start month is closed, so it touches a closed month.
- From ticket 16: Reverse exists now. The `HAS_ACCEPTED_ROWS` fix link can go to the Transactions tab for the import's month, where the rows' menus offer Reverse. Reversing sends the Imported transaction back to pending, so Void becomes possible. `useRefetchAccountReads` (`lib/account-query.ts`) already refetches Statement imports, and Void should call it too. Highlighting by search param is done in `transactions-table.tsx` (`transaction_id`); reuse the pattern for `statement_import_id`.

## Answer

Landed on 2026-11-22.

- **The tab** (`features/statement-import/statement-imports-tab.tsx`): one table of every import across the Account's Connections, newest first (`useAccountStatementImports` in `statement-import-query.ts`). Each row shows the imported date, the Connection (named through `useConnectionNames`, so ticket 11's `name` swap reaches it), the Export balance (plus "Opening balance €…" on a first import), "N imported · N skipped · N suspected" (plus "N ignored" when above 0), and the Balance check as a text badge. FAILED carries "Void it and import a corrected file." unless the import is voided. A voided import is muted with "Voided on …" and has no Void. With no imports, the tab says so and links to Import statement.
- **Void**: "Void…" (accessible name "Void the import of Nov 21, 2026"), enabled only when `void_blocked_by` is empty. Otherwise it is disabled but still focusable, described by its reasons:
  - `NOT_LATEST`: "Only the latest import can be voided." (no link);
  - `HAS_ACCEPTED_ROWS`: "Some of its rows are Accepted." with "Reverse them in Transactions", which goes to the open month's Transactions;
  - `TOUCHES_CLOSED_MONTH`: "It has rows in a closed month." with "Reopen October 2026", which goes to the latest closed month.

  A reason the build doesn't know is shown as sent.
- **Dialog** (`void-dialog.tsx`): the spec's wording ("Void the import of Nov 21, 2026 (9 rows)?"), plus the first-import sentence when the import has an `opening_balance`. A refusal stays in the dialog as an alert, so the User can try again or cancel. On success, the toast "Statement import voided." with **Import statement**. `useVoid` refetches through `useRefetchAccountReads` plus the Transactions (the Opening balance reversal).
- **Highlight**: `?statement_import_id=` gives the row `aria-current`, a tint, and scrolls to it and focuses it once, as Transactions does.
- **The mock**:
  - **Void handler** (`statement-import-handlers.ts`): uses the backend's problems word for word, refused in this order: `statement-import-already-voided`, `not-the-latest-statement-import`, `statement-import-has-accepted-rows`, `statement-import-touches-closed-month` (with `booking_month` and `open_month`). It Discards the import's rows and releases its file. A first import also reverses the Opening balance Transaction and sets the Account back to awaiting its first import. A later import takes its `rows_total` off the Account balance.
  - **Reseed**: Main now has three earlier imports through Connection 1 (`mainEarlierImports` in `db.ts`, rows not kept): its first of 2026-01-03 (Opening balance €2,500.00), one of 2026-10-15, and one of 2026-11-20 that FAILED and was voided.
- **Tests**:
  - **e2e** (`e2e/statement-imports.spec.ts`), three tests:
    - Main's list and the blocked reasons with their links; Reversing the two Accepted rows unblocks Void; Void, the toast, October's import then voidable;
    - Credit card's first import voided, with the Opening balance sentence, a refusal in the dialog (`mock-fail=POST:3`), and the Account awaiting its first import again;
    - the month screen's unchecked-import link landing on the highlighted, focused row.

    `account.spec.ts` now checks the Statement imports region instead of the stub's heading. axe runs on every state.
- **`make check`** passes: lint, typecheck, 380 unit tests, build, audit, contract check, 70 e2e tests and the image.
