# Months, Month close and Reopen

Status: done
Blocked by: 08, 10, 13
Waits on backend: yes. Needs one open month per Account, Reopen with `reopen_blocked`, `unchecked_statement_imports`, the months list, and `NOT_OPEN_YET`.

## What to build

- The Months tab, newest first.
- The month screen with arrows and four states: Open (blockers up front, the Statement balance with a live difference, Close), Closed (Reopen when it's the latest; disabled with the reason when `reopen_blocked`), Not open yet, and Awaiting the first Statement import.
- In To review, rows in months not open yet are locked, with the reason.

## Acceptance criteria

- [x] E2e covers closing a month, a refused close showing its `reasons`, Reopen allowed and blocked, and each month state. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 34, 39–42; Months, Month close, Reverse and Void.

## Notes

- From ticket 08: `…/accounts/$accountId/months.tsx` is a stub.
- From ticket 13: `months.tsx` moved to `months/index.tsx`, and `months/$bookingMonth.tsx` is a stub; To review's empty month links to it ("Go to March 2026"). Rows booked in a month not open yet should show no Accept, Keep or Discard, with "February 2026 isn't open yet": the row actions are in `features/to-review/review-table.tsx`, and the checkbox should leave those rows out of the bulk actions too. `useDecide` should also refetch the month reads.

## Answer

Landed on 2026-11-22.

- **Contract moved to v0.2.0** (`make contract-update ref=v0.2.0`). That backend release carries the month rules this ticket needs, plus Connection names, `encoding`, the mapping test, Account rename and `void_blocked_by` for later tickets. Only the mock needed changes to compile; other tickets' features are untouched (notes left on 11, 16, 17, 18, 19).
  - **Running against a real backend** needs a backend release after v0.2.0. At the tag, the months list and Reopen answered 501; the backend's later commits implement them. The contract is unchanged since the tag.
- **The Months tab** (`features/months/months-tab.tsx`): every month newest first, with a state badge (text, colour only a hint; unknown states shown as sent), and the Pending, Suspected duplicates and Uncategorised counts, each month linking to its screen.
- **The month screen** (`features/months/month-page.tsx`): ← / → links named "Previous month: September 2026", disabled at the ends, the state badge, and the month as it stands.
  - **Open** (`open-month.tsx`):
    - **Blockers**: each links to its fix: To review for the month (Suspected duplicates with `state`), its Uncategorised Transactions, or the unchecked import (`?statement_import_id=`). With none: "Nothing stops October 2026 closing."
    - **The Close form**: the Statement balance (amount input) with "Computed balance €1,600.00 · Difference €100.00" live, the "nothing is booked" help with a link to the month's Transactions, Close always enabled, and the consequence sentence under it.
    - **Before the month ends** (UTC, `hasEnded` in `lib/month.ts`), the form is disabled: "You can close November 2026 from Dec 1, 2026."
    - **A refusal** replaces the blockers with its reasons, read from the problem's fields: the counts as the same fix links, and the balance mismatch as three amounts. The input is kept. Other refusals show as a form alert.
    - **Success** toasts "October 2026 closed. November 2026 is open." and goes to the next month.
  - **Closed** (`closed-month.tsx`): Statement balance, computed balance, "Closed on …". Reopen appears only on the latest closed month. With `reopen_blocked` it is disabled, described by "October 2026 has Accepted Transactions. Reverse them first.", which links to that month's Transactions. The dialog has the spec's wording; a refusal shows inside it. Afterwards a toast, and the month is open again.
  - **Not open yet**: "November 2026 opens when October 2026 closes.", "Close October 2026 first" linking there, and the month's pending count.
  - **Awaiting the first Statement import** (screen and tab): "Import the first statement".
  - **Outside the Account's months**: "July 2026 isn't a month of this Account." with "See all months".
- **Callbacks**: close and Reopen await `mutateAsync`. A `mutate` callback never ran, because the refetched months unmount the form first. They refetch the months, the Account, the Accounts list, Imported transactions and Statement imports.
- **To review** locks Pending rows booked after `account.open_month`: no picker, no Accept or Discard, a lock icon with "November 2026 isn't open yet", and a disabled checkbox that "select all" leaves out. Suspected duplicates there can still be kept or Discarded, as the contract allows. Decisions refetch the months too.
- **The mock**:
  - **The month model** (`src/mocks/months.ts`, `src/mocks/month-handlers.ts`): Accounts carry `open_month`; Month closes are stored per Account. The months list, one month, close and Reopen follow the backend's rules and wording, with the close's `reasons` and details.
  - **Rules elsewhere**: Accept, Keep and Discard refuse rows in closed or not-open-yet months. Imports ignore and count rows in closed months, and the imports list carries `void_blocked_by`.
  - **Bug fixed**: request bodies with money are read with the exact-JSON reader.
  - **Seeds**:
    - Main's open month is November 2026 (January to October closed, at their computed balances); Main's Ikea row moved to Nov 2.
    - **Savings** is a new seeded Account for the month flows: August and September closed, October open with one deposit Accepted and Interest pending, November not open yet with one pending row.
- **Tests**:
  - **e2e** (`e2e/months.spec.ts`, 5 tests, the clock fixed at 22 Nov 2026, axe on each state):
    - the Months tab;
    - a refused close with its reasons, fixed through To review, then a successful close onto a November not yet ended, and Reopen;
    - Reopen blocked, and absent on an older closed month;
    - not open yet, outside the months, and awaiting;
    - To review's locked row.
  - **Unit**: `hasEnded` and `closesFrom` in UTC, and the month states against the contract.
  - `to-review.spec.ts` was updated for the reseeded months.
- **`make check`** passes: lint, typecheck, 380 unit tests, build, audit, the contract check against v0.2.0, 63 e2e tests and the image (`min-api-version` v0.2.0).
