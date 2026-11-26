# 06: Close and reopen a cash month by a count

Status: needs-triage
Blocked by: 05
Waits on backend: no

## What to build

**The open cash month's close form**

- **Fields:** **Cash count** and **Counted on**. Counted on defaults to today, with min the day after the month's last day and max today.
- **No live difference:** the computed balance and difference are hidden for cash.
- **The request:** `{statement_balance, counted_on}`. `counted_on` is never sent for statement Accounts.

**A `BALANCE_MISMATCH` refusal**

- **What it shows:** the books on Counted on, the count, and the difference.
- **Record the difference…:** opens the recording sheet (ticket 05) prefilled with:
  - the difference as a signed amount;
  - the month's last day as the date;
  - "Cash count difference" as the description.

**Other problems:** 422 `invalid-count-date` is the form alert.

**A closed cash month** shows **Counted on**, plus the Statement balance labelled "Balance at month end (proven by the count)".

**Reopen:** the confirmation adds "You'll need to count again to close it".

**Every month, any kind:** `transfer_legs_in_transit` > 0 shows "{n} Transfer legs In transit" as information, not among the blockers. It links to the In transit filter, which comes in ticket 08. Until then, show the text without the link.

## Acceptance criteria

- [ ] The cash close form and its Counted on range (a small tested function)
- [ ] The refusal with Record the difference…, and a second close passing after the difference is recorded
- [ ] The closed cash month's display, and the Reopen wording
- [ ] The In transit count on months
- [ ] Mock close:
  - requires `counted_on` for cash and refuses it otherwise (`invalid-month-closing`);
  - `invalid-count-date`;
  - compares the books at the end of `counted_on` with the count;
  - stores the month-end balance as `statement_balance`;
  - stores `counted_on`
- [ ] Mock reopen for cash works even with Transactions in later months
- [ ] E2e: refusal, then Record the difference…, then close; closed month shown; reopen; axe

## Spec

[spec.md](../spec.md): stories 15–18; "Closing a cash month".
