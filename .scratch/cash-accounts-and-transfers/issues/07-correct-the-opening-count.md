# 07: Correct the opening count

Status: in-review
Blocked by: 04
Waits on backend: no

## What to build

**Correct opening count…** goes in a cash Account's ⋯ menu, shown only while the Account's `open_month` is the start date's month.

**The dialog:**

- the count typed twice, with the same in-form check as Add Account;
- then `POST …/accounts/{id}/opening-count` with an Idempotency-Key.

**On 200:** the Account's queries and Transactions are invalidated.

**409 `opening-count-locked`:** shown as the form alert.

## Acceptance criteria

- [x] The menu item shows and hides as described
- [x] The dialog with the in-form check, its 200 refresh, and the 409 alert
- [x] Mock `recountOpening`:
  - `not-a-cash-account` for a statement Account;
  - `opening-count-mismatch`;
  - `opening-count-locked` once the start month is closed;
  - updates the Opening balance Transaction and the balance
- [x] E2e: correct in the start month, and see the new balance; after closing the start month the item is gone; axe

## Spec

[spec.md](../spec.md): story 5; "Correct opening count…".

## Comments

- 2026-11-27: built on `build/cash-accounts-07-correct-the-opening-count`, from main (it needs only 04).
  - **The menu item:** `canCorrectOpeningCount` (in `src/lib/account-query.ts`) is true for a cash Account whose `open_month` is its start date's month. The ⋯ menu shows **Correct opening count…** only then.
  - **The dialog:** **Opening count** and **Opening count again** in the Account's currency, with the same in-form check as Add Account. The check moved to `checkOpeningCounts` (`src/features/accounts/opening-count.ts`), and both forms use it. The Idempotency-Key comes from the client's middleware, as for every write.
  - **On 200:** the dialog closes. The Account's reads (`useRefetchAccountReads`) and its Transactions are invalidated, so the header's balance and the new Opening balance row show.
  - **Problems:** any server problem, `opening-count-locked` included, is the form alert.
  - **Mock:** `recountOpening` lives in the new `src/mocks/account-handlers.ts`, with the backend's checks in its order and its wording: `not-a-cash-account`, then the counts (`invalid-account`, `opening-count-mismatch`), then `opening-count-locked` once the start month has closed. It reverses the Opening balance Transaction, links it to its reversal, records the new one on the start date and sets the balance. The same count again records nothing. Add Account's mock now shares the count check and the Opening balance Transaction with it.
  - **Tests:** unit tests for the mock and for `canCorrectOpeningCount`. E2e: the counts required, then different, then corrected, with the new balance and row; no item on a statement Account; a close by someone else meanwhile gives the `opening-count-locked` alert, and after a reload the item is gone. Each has axe.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check against v0.9.0;
  - 511 unit tests;
  - 128 of 128 e2e;
  - the image test.
