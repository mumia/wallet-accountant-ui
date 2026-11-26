# 05: Record a cash Transaction

Status: needs-triage
Blocked by: 03, 04
Waits on backend: no

## What to build

A **Record a Transaction** side sheet on a cash Account, full-screen on mobile. It opens from:

- the header button;
- the Transactions empty state, "No Transactions yet — Record one".

**The fields, in order:**

1. **Amount:** signed, required, not zero.
2. **Other side:** the sign-filtered CategoryPicker. Empty means Uncategorised.
3. **Date:** defaults to today. **DateInput gains a `min` prop.**
   - Earliest: the later of the open month's 1st and the start date.
   - Latest: today in UTC.
   - Later months are allowed silently.
4. **Description:** required, 1–500 characters.
5. **Payee:** optional, at most 200 characters.

**Sign changes:** when a sign change makes the chosen Category unfit, it's cleared with a field message.

**The request** is `POST …/accounts/{id}/transactions`, with one Idempotency-Key per form, renewed after each save.

**The buttons:**

- **Save and add another** (the default on Enter): keeps the date, clears the rest, focuses Amount.
- **Save:** closes the sheet.

**After each save:** a toast, and the Account's Transactions, balance and months invalidated.

**Problems** show as the form alert, with the input kept.

**Prefilling:** the sheet can be opened prefilled with amount, date and description, for ticket 06.

The **Transfer** group in the picker comes in ticket 08.

## Acceptance criteria

- [ ] DateInput's `min`: days before it are disabled, and the form refuses a typed earlier date
- [ ] The sheet, fields, rules and buttons as described. The date range is a small tested function
- [ ] Idempotency: a retried save doesn't record twice (mock replay)
- [ ] A prefill API used by ticket 06
- [ ] Mock `recordCashTransaction`:
  - refuses a statement Account (`not-a-cash-account`);
  - refuses a date after today or in a closed month;
  - with no Category, books against Uncategorised;
  - updates the balance;
  - replays on the same Idempotency-Key
- [ ] E2e: spending, income, Uncategorised; Save and add another; a Category cleared by a sign flip; a date before the open month refused; axe on the sheet

## Spec

[spec.md](../spec.md): stories 6–9; "Record a Transaction".
