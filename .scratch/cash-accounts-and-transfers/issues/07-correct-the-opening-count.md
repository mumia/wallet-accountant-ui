# 07: Correct the opening count

Status: needs-triage
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

- [ ] The menu item shows and hides as described
- [ ] The dialog with the in-form check, its 200 refresh, and the 409 alert
- [ ] Mock `recountOpening`:
  - `not-a-cash-account` for a statement Account;
  - `opening-count-mismatch`;
  - `opening-count-locked` once the start month is closed;
  - updates the Opening balance Transaction and the balance
- [ ] E2e: correct in the start month, and see the new balance; after closing the start month the item is gone; axe

## Spec

[spec.md](../spec.md): story 5; "Correct opening count…".
