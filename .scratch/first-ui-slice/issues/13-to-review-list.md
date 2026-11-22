# To review list

Status: done
Blocked by: 09, 12
Waits on backend: partly. The month field's options need the months list, and locking rows in months not open yet needs the month rules. Both are finished in ticket 19 and ticket 15 respectively.

## What to build

- The Suspected duplicates section above the Pending section, with the "Resembles" box. A per-row Category picker starting on Uncategorised.
- Accept, Keep and Discard: optimistic, a confirmation dialog for Discard, the 409 "Already Accepted" handling.
- Bulk selection with row-labelled checkboxes, a mixed-state header checkbox, Shift+click ranges and a polite announcement. The bulk bar sends one request per row, about 4 at a time, and reports "18 Accepted, 2 failed".
- `booking_month` and `state=SUSPECTED_DUPLICATE` in the URL, and the empty states.

## Acceptance criteria

- [x] Component tests cover bulk selection by keyboard and role.
- [x] E2e covers Accept with a Category, Keep, a confirmed Discard, bulk with partial failure, and the state filter. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 29–33; To review; Accessibility (Bulk selection).

## Notes

- From ticket 08: `…/accounts/$accountId/to-review.tsx` is a stub with `validateSearch: bookingMonthSearch`.
- From ticket 09: The row picker is `components/category-picker.tsx` (see ticket 10's note); it starts on Uncategorised: pass the Uncategorised Category's ID, found with `isUncategorised` in `lib/categories.ts`.
- From ticket 10: `components/month-field.tsx` is the month field (arrows, "All months"), fed by `accountMonths` from the seam; `components/toaster.tsx` has `useErrorToast` for per-row failures. Paging and optimistic patterns are in `features/transactions/transactions-query.ts`.
- From ticket 12: `to-review.tsx` now validates `toReviewSearch` (`lib/search.ts`): `booking_month` plus `state=SUSPECTED_DUPLICATE`. The import result links there with `state` when it found Suspected duplicates. The mock records each import's rows in `importedRows` (`src/mocks/db.ts`), with Main's two seeded rows; serve `listImportedTransactions` from them.

## Answer

Landed on 2026-11-22.

- **The tab** (`features/to-review/to-review-tab.tsx`):
  - **Sections**: Suspected duplicates, with a line on what to do, above Pending. Each is a labelled region, hidden when empty.
  - **Reads** (`to-review-query.ts`): one per state, with `booking_month` when chosen. Suspected duplicates load in full. Pending loads a chosen month in full; for all months it uses infinite scroll, virtualised, with "Showing N Pending rows so far".
  - **Virtualisation**: `components/use-window-rows.ts` now holds what the Transactions table did, and measures rows of any height.
- **Rows** (`review-table.tsx`, presentational):
  - a plain checkbox labelled "Select Nov 17, 2026, Jumbo, -€12.35";
  - Booking date, with the Transaction date when it differs;
  - payee over description;
  - the dashed Resembles box, each differing field marked "(differs)" in text;
  - amount;
  - the Category picker on Pending rows, starting on Uncategorised;
  - Accept (Pending) or Keep (Suspected), and Discard, each named after the row.
  - API order, no sorting.
- **Selection** (`lib/selection.ts`): Shift+click ranges from the last row clicked (the click event carries Shift), a header checkbox per section with a mixed state (set on the element), and a polite "3 selected" status that is always in the page.
- **Decisions**:
  - **Optimistic, as page state, not cache edits**: Accept and Discard hide the row, and Keep moves it into Pending. Once the refetched lists arrive, the page state is dropped, so a failed row comes back by itself.
  - **One request per row** (`useDecide`): 4 at a time (`lib/pool.ts`), each a mutation with its own Idempotency-Key and the write retries.
  - **Afterwards** it refetches Imported transactions, Transactions, the Account, the Accounts list and Statement imports (deciding the last Suspected duplicate runs the import's Balance check).
- **A 409 is not a failure**, by status alone: no list of problem types. Someone else decided the row first, so it stays gone, the lists are refetched, and an info toast gives the server's title ("Imported transaction already Accepted") with the row.
- **Toasts**:
  - one Accept: "1 Accepted" with "View in Transactions" (`useInfoToast`, a new Base UI `Toast.Action`, 8 s, paused on hover or focus);
  - bulk: "5 Accepted, 1 failed, 1 already decided by someone else". With failures it stays until closed and names the first one. Failed rows stay selected.
  - one failure: "{row} wasn't Accepted" with the problem.
- **Bulk bar**: "Accept as [Category]" only when every selected row is Pending, Keep only when every one is a Suspected duplicate, Discard always, and "Clear selection".
- **Discard dialog**: one for one row or many, listing up to five, with a title, description and Cancel. The confirm button uses the default variant: the shadcn destructive variant fails axe's contrast check.
- **Filters**:
  - `booking_month` uses the month field, through ticket 10's seam.
  - `state=SUSPECTED_DUPLICATE` shows only that section, with "Showing Suspected duplicates only" and "Show everything".
  - Changing the month or the filter starts the lists and the selection over.
- **Empty states**:
  - "Nothing to review" with "Go to Transactions";
  - "Nothing to review in September 2026" with "Show all months" and "Go to September 2026";
  - "No Suspected duplicates to review";
  - an Account awaiting its first import shows "Import the first statement" instead.
- **Supporting changes**:
  - **Shared row names**: `components/row-label.ts` (moved from the Transactions table).
  - **Months routes**: `months.tsx` became `months/index.tsx`, plus a `months/$bookingMonth.tsx` stub.
  - **The mock**:
    - Imported transactions carry state, line and the row they resemble (`resembles_id`, shown as that row is now).
    - It serves list, Accept, Keep and Discard with the backend's rules and wording (`mocks/imported-transaction-handlers.ts`). Main is seeded with 6 Pending rows, 1 Suspected duplicate and 2 Accepted rows.
    - **Bug fixed**: handlers read the state before awaiting the request body and wrote back a stale copy, so concurrent writes lost each other. They now read the body first, and saves read the current state.
- **Not yet**:
  - **Months not open yet**: locking their rows waits for the month rules (ticket 15).
  - **Month options**: offering only months with rows To review waits for ticket 19.
  - **Notifications**: refetching them after a decision waits for ticket 14.
  - **The 409 path** has no e2e test: the mock has no second member. It's the `conflict` outcome in `useDecide`.
- **Tests**:
  - **Component** (`review-table.test.tsx`): row-labelled checkboxes, keyboard selection with the mixed header, Shift+click ranges both ways, select all and none, row action names, the Resembles box, and the states against the contract. Units for `lib/selection.ts` and `lib/pool.ts`.
  - **e2e** (`e2e/to-review.spec.ts`, 5 tests, axe on each state): Accept with a picked Category (seen in Transactions), Keep moving a row, a confirmed Discard (Cancel first, kept after reload), bulk Accept with one row failing (`?mock-fail=<id>/accept:3`), and the state filter with the empty states.
- **`make check`** passes: lint, typecheck, 376 unit tests, build, audit, contract, 56 e2e tests and the image.
