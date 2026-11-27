# 06: Close and reopen a cash month by a count

Status: done
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

- [x] The cash close form and its Counted on range (a small tested function)
- [x] The refusal with Record the difference…, and a second close passing after the difference is recorded
- [x] The closed cash month's display, and the Reopen wording
- [x] The In transit count on months
- [x] Mock close:
  - requires `counted_on` for cash and refuses it otherwise (`invalid-month-closing`);
  - `invalid-count-date`;
  - compares the books at the end of `counted_on` with the count;
  - stores the month-end balance as `statement_balance`;
  - stores `counted_on`
- [x] Mock reopen for cash works even with Transactions in later months
- [x] E2e: refusal, then Record the difference…, then close; closed month shown; reopen; axe

## Spec

[spec.md](../spec.md): stories 15–18; "Closing a cash month".

## Comments

- 2026-11-27: built on `build/cash-accounts-06-close-a-cash-month`, from main (05 is merged).
  - **The close form** (`src/features/months/open-month.tsx`): `OpenMonth` takes `cash`. For cash it shows **Cash count** and **Counted on** and hides the computed balance and the difference. It sends `counted_on` only for cash (`useCloseMonth` takes an optional `countedOn`). The form refuses an empty count and a typed day outside the range, naming the first allowed day.
  - **The Counted on range:** `countedOnRange` (`src/lib/cash-dates.ts`) gives `min` (the 1st of the next month), `max` (today in UTC) and the default (today in the browser's zone, kept within the range). `lastDayOf` gives the month's last day for Record the difference….
  - **The refusal:** for cash, the mismatch reads "Books on {Counted on}", "Cash count" and "Difference", and adds **Record the difference…**. That calls `useRecordTransaction()` with the difference, the month's last day and "Cash count difference", and no Category. The outline button gets `text-foreground`, because it would otherwise inherit the alert's red and fail axe's contrast check.
  - **Other problems:** `invalid-count-date` has no `reasons`, so it shows as the form alert through the existing path. No test triggers it from the UI, because the form's own range check stops the request first. The mock's test covers the problem itself.
  - **The closed month** (`closed-month.tsx`): **Counted on** when the month has `counted_on`, and for cash the Statement balance is labelled "Balance at month end (proven by the count)". The Reopen confirmation for cash ends "You'll need to count again to close it."
  - **In transit:** `InTransitCount` (`src/features/months/in-transit-count.tsx`) sits under the month's heading on every month, of any kind, when `transfer_legs_in_transit` > 0. It's plain text for now, and ticket 08 adds the link. It has a unit test, because the mock can't make a leg until ticket 08.
  - **The mock** (`src/mocks/month-handlers.ts`, `months.ts`) follows the backend's v0.9.0 wording:
    - a 400 `invalid-month-closing` either way;
    - a 422 `invalid-count-date`;
    - a cash count compared with `balanceAt(counted_on)`;
    - the month-end balance stored as `statement_balance`, with `counted_on`.
    - A cash Account skips the Accepted-Transactions condition on Reopen.
  - **Earlier tests changed:** three e2e specs (`account`, `record-cash`) and two mock tests closed a cash month without `counted_on`, which the mock now refuses. They now send it.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check;
  - unit tests: 545 passed;
  - e2e: 133 passed (new: `e2e/close-cash.spec.ts`);
  - the image test.
- 2026-11-27: review fixes.
  - **The refusal clears once the difference is recorded:** `RecordPrefill` has `onRecorded`, which the sheet calls after each save. Record the difference… uses it to reset the close, so the stale numbers and button go and the month's own blockers show again. The e2e checks this.
  - **The Counted on range is computed on each render**, as `ended` is, so a page left open past midnight UTC follows the day.
  - **Wording:**
    - a day after today is refused naming it: "The latest day is {date}: today, in UTC";
    - the refusal's hint says to record the difference in a Category, since Uncategorised stops the close.
  - **The mock** answers a 400 "Invalid value for: counted_on." for a `counted_on` that isn't a calendar date, before any other check, as the backend's decoder does.
  - `make check` passed: unit tests 548, e2e 133, and the image test.
