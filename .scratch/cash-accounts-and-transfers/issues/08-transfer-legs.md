# 08: Transfer legs: record them, and show them in Transactions

Status: done
Blocked by: 05
Waits on backend: no

## What to build

**Recording a leg**

- **The Transfer group:** the recording sheet's picker gains a **Transfer** group, offered both ways, listing every other Household Account in the same currency.
- **Its labels:** "Transfer to Bank" for money out, "Transfer from Bank" for money in, and "Transfer · Bank" with no amount.
- **A statement Counterpart:** picking one shows the In transit note.
- **The request:** sends `counterpart_account_id`. For cash ↔ cash, the Counterpart Account's queries are invalidated too.

**Legs in Transactions** (any Account)

- **What makes a row a leg:** `counterpart_account_id`.
- **The Category cell:** fixed text, "Transfer to/from {Counterpart}", with the name linking to that Account's Transactions.
- **In transit:** a leg without `match_id` shows an **In transit** badge.
- **The filter:** an **In transit only** chip uses `in_transit=true`, and is disabled for all months.

**Months:** the In transit count from ticket 06 now links to that filter.

## Acceptance criteria

- [x] The Transfer group in the recording picker, its labels and the In transit note
- [x] Leg display, the badge and the filter chip. The leg label is a small tested function
- [x] Mock `recordCashTransaction` with `counterpart_account_id`:
  - a statement Counterpart makes an In transit leg;
  - a cash Counterpart makes both legs Matched (`match_id`);
  - `invalid-transfer` with `SAME_ACCOUNT`, `CURRENCY_MISMATCH` or `UNKNOWN_ACCOUNT`
- [x] Mock `listAccountTransactions?in_transit=true`
- [x] Mock `changeTransaction` on a leg: `transfer-leg`
- [x] E2e:
  - an ATM leg noted in Wallet shows In transit and appears under the filter;
  - cash ↔ cash shows on both Accounts, without the badge;
  - the Counterpart link;
  - axe

## Spec

[spec.md](../spec.md): stories 10–12, 21–23; "Record a Transaction" (Transfer group); "Transfer legs in Transactions".

## Comments

- 2026-11-27: built on `build/cash-accounts-08-transfer-legs`, from main (05, 06 and 11 are merged).
  - **The picker:** `CategoryPicker` takes `transfers`, a list of Accounts, and offers them last in a **Transfer** group that fits both signs. Their values are `transferValue(account_id)`, which `counterpartOf` reads back. Ticket 09 can pass the cash Accounts only. The labels come from `transferLabel` (`src/lib/transfers.ts`): "Transfer to Bank", "Transfer from Bank", or "Transfer · Bank" with no amount.
  - **The sheet** offers every other Household Account in the same currency. A statement Counterpart shows the In transit note, which is part of the picker's description. The request sends `counterpart_account_id` instead of `category_id`. For a cash Counterpart, its Transactions and reads are invalidated too: `refetchAccountReads` is now a plain function that `useRefetchAccountReads` wraps.
  - **Legs in Transactions:** a row with `counterpart_account_id` shows "Transfer to/from {Counterpart}" as fixed text. The name links to the Counterpart's Transactions in the leg's month. A leg with no `match_id` that isn't reversed shows an **In transit** badge (`isInTransit`). While the Accounts list loads, the cell shows `category_name`.
  - **The filter:** `in_transit=true` in the URL. The **In transit only** chip sends it to `listAccountTransactions`, and its count is the month's `transfer_legs_in_transit`. It and Uncategorised only are exclusive, since no leg is Uncategorised. Both are disabled for all months and share one "Choose a month first" hint. An empty result reads "Nothing in {month} is In transit ✓".
  - **Months:** `InTransitCount` links to that filter.
  - **The mock** follows the backend's `recordCashLeg`:
    - `SAME_ACCOUNT`, `UNKNOWN_ACCOUNT` and `CURRENCY_MISMATCH`, in that order;
    - a leg against Account transfer;
    - for cash ↔ cash, the opposite leg too, the two booked in Account ID order, both carrying one `match_id`;
    - either Account's start date or closed month refuses it, naming that Account, and books neither leg.
    - The list honours `in_transit=true`. Set Category on a leg is a 422 `transfer-leg`, checked where the backend checks it.
  - **Not here:** Reverse of a leg still reverses only that one row in the mock. Ticket 10 does legs.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check;
  - unit tests: 571 passed (new: `src/lib/transfers.test.ts`, the picker's Transfer group, seven in `src/mocks/transaction-handlers.test.ts`, and the In transit link);
  - e2e: 138 passed (new: `e2e/transfer-legs.spec.ts`);
  - the image test.
