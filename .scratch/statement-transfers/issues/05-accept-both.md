# 05: Accept both rows of a Transfer

Status: ready-for-agent
Blocked by: 04
Waits on backend: no, once 02 is in

## What to build

**Pending rows in the dialog:** the suggestions' `imported_transactions`, after the legs and before the last choice, under "Pending in {Account}". Each reads description, date, amount. Confirming one sends `{transfer_account_id, match_imported_transaction_id}`; the button reads **"Accept both"** while a row is picked. The dialog now opens when there are legs or rows.

**Rows that can't be paired yet:** a row booked after the counterpart's `open_month` (from the Accounts list) is a disabled radio with its reason, tied by `aria-describedby`: "Card's February 2026 isn't open yet. Accept alone now, and Match it when that month opens." The default pick skips disabled rows; with nothing else choosable, Accept alone is picked.

**Refusals**, each the dialog's alert with the suggestions refetched:

- 422 `NOT_A_MATCHING_ROW`: the row was taken first;
- 409 `month-not-open-yet` or `month-closed` with `account_id`: the Accounts list was stale. Name the Account.

**After Accept both:** toast "Accepted both: {row} and {Account}'s {other row}". Invalidate this Account's reads and the counterpart's To review, Transactions, balance and months.

## Acceptance criteria

- [ ] Rows in the dialog, the "Accept both" button, and the disabled rows, as above
- [ ] Unit test: a row's pairing state from its Booking month and the counterpart's Open month
- [ ] Mock suggestions: pending rows on bank and card counterparts, opposite amount, ±7 days, closest first, each with `account_id`; Suspected duplicates left out; rows in a month not open yet included
- [ ] Mock Accept with `match_imported_transaction_id`: both rows Accepted, both legs Matched; `NOT_A_MATCHING_ROW` (another Account, not pending, the row itself, another amount); `month-not-open-yet` naming the paired row's Account
- [ ] E2e: Accept both, then the card's To review no longer lists its row and nothing is In transit; a disabled row with its reason; the row taken first; axe with legs, rows and a disabled row

## Spec

[spec.md](../spec.md): stories 5, 6, 9; "Accept both (ticket 05)".
