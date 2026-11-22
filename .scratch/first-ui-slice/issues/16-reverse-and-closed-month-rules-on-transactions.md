# Reverse and closed-month rules on Transactions

Status: open
Blocked by: 10, 15
Waits on backend: yes. Needs `imported_transaction_id` on AccountTransaction and the closed-month rules.

## What to build

- Reverse in the row menu: open month only, never on reversals, reversed Transactions or the Opening balance Transaction. The dialog uses the spec's exact wording. No optimistic update; a toast with an Open link.
- Reversed and reversal rows: muted, with badges and links between them, and left out of the Uncategorised filter.
- Rows in a closed month: the picker without Uncategorised, no Reverse, and a lock icon with the reason.

## Acceptance criteria

- [ ] E2e covers a Reverse with and without an Imported transaction, and editing a closed-month row. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 36–37; Months, Month close, Reverse and Void (Reverse).

## Notes

- From ticket 10: The row's Category cell is in `features/transactions/transactions-table.tsx`; the Reverse menu and the closed-month rules (no Uncategorised there) go there.
- From ticket 12: the preview's and result's ignored-rows note covers rows before the start date only. When the contract carries `rows_ignored_in_closed_months` (backend HEAD has it, pinned v0.1.0 doesn't), add it to `preview-step.tsx` and `result-step.tsx`.
- From ticket 15: The contract is pinned to v0.2.0 since ticket 15: `imported_transaction_id` on AccountTransaction, `rows_ignored_in_closed_months` on the preview and the import (the mock counts rows in closed months), and the closed-month problems (`month-closed`, `uncategorised-in-closed-month`). Main's open month is November 2026, so January to October are closed. Its seeded ledger still has Uncategorised rows in those closed months, and the Transactions e2e changes March. Decide whether to move those tests to November or reseed. The mock doesn't yet refuse `PATCH`/`reverse` in closed months.
