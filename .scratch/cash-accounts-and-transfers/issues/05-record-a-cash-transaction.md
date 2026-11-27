# 05: Record a cash Transaction

Status: done
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

- [x] DateInput's `min`: days before it are disabled, and the form refuses a typed earlier date
- [x] The sheet, fields, rules and buttons as described. The date range is a small tested function
- [x] Idempotency: a retried save doesn't record twice (mock replay)
- [x] A prefill API used by ticket 06
- [x] Mock `recordCashTransaction`:
  - refuses a statement Account (`not-a-cash-account`);
  - refuses a date after today or in a closed month;
  - with no Category, books against Uncategorised;
  - updates the balance;
  - replays on the same Idempotency-Key
- [x] E2e: spending, income, Uncategorised; Save and add another; a Category cleared by a sign flip; a date before the open month refused; axe on the sheet

## Spec

[spec.md](../spec.md): stories 6–9; "Record a Transaction".

## Comments

- 2026-11-27: built on `build/cash-accounts-05-record-a-cash-transaction`, from main (03 and 04 are merged).
  - **The sheet:** `RecordTransactionProvider` (`src/features/transactions/record-transaction-sheet.tsx`) wraps the Account area in the Account route. Around a statement Account it provides nothing. Any screen opens it with `useRecordTransaction()` (`src/components/record-transaction.ts`): it lives in `components` because features can't import each other. It's opened from the header's **Record a Transaction** and from the Transactions empty states' **Record one**.
  - **The prefill API, for ticket 06:** `useRecordTransaction()?.({ amount, date, description })`. Each opening starts a new form.
  - **The date range:** `cashDateRange` (`src/lib/cash-dates.ts`) gives `min` (the later of the open month's 1st and the start date), `max` (today in UTC, from the new `todayUtc`), and the default: today in the browser's zone, kept within the range. DateInput has `min`. The form refuses a typed date outside the range, naming either the start date or the closed months.
  - **The sign rule:** the picker is filtered by the amount's sign. A sign change that makes the chosen Category unfit clears it and names it in a polite live message under the picker.
  - **Buttons:** Save and add another comes first, so Enter uses it. It keeps the date, clears the rest and focuses Amount; AmountInput has `inputRef` for that. Save closes the sheet. Each save shows a toast and invalidates the Account's Transactions and its reads (`useRefetchAccountReads`: balance, months, the Accounts list).
  - **Idempotency:** the client's middleware gives the key, as for every write. A retried request keeps it, and it's renewed after each success. A key held by the form would make a changed input after an error reuse the key with another body, which the backend refuses with a 422.
  - **Mock `recordCashTransaction`** (`src/mocks/transaction-handlers.ts`): the backend's v0.9.0 checks in its order, with its wording. A replay on the same Idempotency-Key answers with the first Transaction (`cashRecords` in the mock state). It keeps the list in Booking date order and updates the balance. A Transfer leg answers 500 until ticket 08.
  - **Tests:** unit tests for the mock, `cashDateRange` and DateInput's `min`. E2e (`e2e/record-cash.spec.ts`): spending, income and Uncategorised, with Save and add another; a Category cleared by a sign flip; a date before the open month refused, from the empty state's Record one; a month closed meanwhile shows as the form alert, with the input kept. Each has axe.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check against v0.9.0;
  - unit tests: 529 passed;
  - e2e: 132 passed;
  - the image test.
