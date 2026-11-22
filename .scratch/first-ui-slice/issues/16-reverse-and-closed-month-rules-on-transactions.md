# Reverse and closed-month rules on Transactions

Status: done
Blocked by: 10, 15
Waits on backend: yes. Needs `imported_transaction_id` on AccountTransaction and the closed-month rules.

## What to build

- Reverse in the row menu: open month only, never on reversals, reversed Transactions or the Opening balance Transaction. The dialog uses the spec's exact wording. No optimistic update; a toast with an Open link.
- Reversed and reversal rows: muted, with badges and links between them, and left out of the Uncategorised filter.
- Rows in a closed month: the picker without Uncategorised, no Reverse, and a lock icon with the reason.

## Acceptance criteria

- [x] E2e covers a Reverse with and without an Imported transaction, and editing a closed-month row. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 36–37; Months, Month close, Reverse and Void (Reverse).

## Notes

- From ticket 10: The row's Category cell is in `features/transactions/transactions-table.tsx`; the Reverse menu and the closed-month rules (no Uncategorised there) go there.
- From ticket 12: the preview's and result's ignored-rows note covers rows before the start date only. When the contract carries `rows_ignored_in_closed_months` (backend HEAD has it, pinned v0.1.0 doesn't), add it to `preview-step.tsx` and `result-step.tsx`.
- From ticket 15: The contract is pinned to v0.2.0 since ticket 15: `imported_transaction_id` on AccountTransaction, `rows_ignored_in_closed_months` on the preview and the import (the mock counts rows in closed months), and the closed-month problems (`month-closed`, `uncategorised-in-closed-month`). Main's open month is November 2026, so January to October are closed. Its seeded ledger still has Uncategorised rows in those closed months, and the Transactions e2e changes March. Decide whether to move those tests to November or reseed. The mock doesn't yet refuse `PATCH`/`reverse` in closed months.

## Answer

Landed on 2026-11-22.

- **Reverse** (`features/transactions/reverse-dialog.tsx`, `useReverse` in `transactions-query.ts`): a row menu ("Actions for Nov 1, 2026, Rent, -€1,150.00" → "Reverse…") only on rows in `account.open_month`, never on reversals, reversed rows or the Opening balance Transaction (its Internal "Opening balance" Category). The dialog has the spec's wording, plus the Imported transaction sentence when `imported_transaction_id` is set. Destructive **Reverse**, not optimistic.
  - **Afterwards**: the toast "Reversed." (plus "Its Imported transaction is back in To review." after an Accept) with **Open**, which goes to the reversal's month with `?transaction_id=` set to the reversal. Refetches the Transactions, months, Account, Accounts list, Imported transactions and Statement imports.
  - **A refusal** closes the dialog and shows a toast naming the row ("… wasn't reversed") with the problem's title and detail.
- **Reversal pairs**: muted. The original has a "Reversed" badge linking to its reversal; the reversal has "Reversal of Oct 26, 2026, Coolblue, -€249.00" linking to its original. Neither has a picker or a menu, and the Uncategorised chip and filter leave both out (as the backend counts).
- **Highlight**: `transaction_id` is a new Transactions search param, like `statement_import_id` for Statement imports. The row gets `aria-current`, a tint, and is scrolled to and focused once (a virtual list scrolls to it first, via the new `scrollToIndex` from `useWindowRows`).
- **Closed months** (rows before `open_month`): a lock by the amount, with "March 2026 is closed" as screen-reader text and a tooltip. The picker leaves out Uncategorised, and there's no Reverse. A single closed month also gets a note above the list: "… is closed: amounts and descriptions are locked. Categories can still change, but not to Uncategorised."
- **From ticket 12**: the import result shows "Ignored, in closed months" when above 0. The preview shows a note when above 0, which the contract says never happens on a first import.
- **Shared refetch**: Month close and Reopen's refetch moved to `useRefetchAccountReads` in `lib/account-query.ts`, so Reverse uses it too (features can't import each other).
- **Theme**: the dark `destructive` token went from `oklch(0.72 0.17 22)` to `oklch(0.74 0.16 22)`. The destructive button in a dialog footer (`bg-muted/50` over the popover) was 4.47:1. The theme unit test now covers that footer, and `over` accepts a colour that was already blended.
- **The mock**:
  - **Handlers**: `src/mocks/transaction-handlers.ts` holds the PATCH (moved out of `handlers.ts`) and Reverse, with the backend's rules and wording: `transaction-is-a-reversal`, `opening-balance-transaction`, `transaction-reversed` / `transaction-already-reversed`, `uncategorised-in-closed-month`, and `month-closed` for Reverse. Reverse records the reversal right after the original and sends an Accepted row's Imported transaction back to pending. Accept now sets `imported_transaction_id`.
  - **Reseed** (decided here): closed months can't hold Uncategorised rows, so Main's Bol.com and Tikkie rows from January to October now have Categories. Only November has Uncategorised rows (6). The Coolblue reversal is booked on its original's date with the same description. Main's two Accepted rows of Nov 14 now have their Transactions (269 in all).
- **Tests**:
  - **e2e** (`e2e/transactions.spec.ts`): the Category tests moved from March to November. Four new tests:
    - Reverse without an Imported transaction (dialog, toast Open, the links highlight each other);
    - Reverse of Savings' Accepted deposit (the extra sentence, back in To review);
    - a failed Reverse;
    - a closed month (lock, no Reverse, no Uncategorised in the picker, the change saved, October's pair).

    `statement-import.spec.ts` checks the closed-month count. axe runs on every state.
- **`make check`** passes: lint, typecheck, 380 unit tests, build, audit, contract check, 67 e2e tests and the image.
