# 08: Transfer legs: record them, and show them in Transactions

Status: needs-triage
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

- [ ] The Transfer group in the recording picker, its labels and the In transit note
- [ ] Leg display, the badge and the filter chip. The leg label is a small tested function
- [ ] Mock `recordCashTransaction` with `counterpart_account_id`:
  - a statement Counterpart makes an In transit leg;
  - a cash Counterpart makes both legs Matched (`match_id`);
  - `invalid-transfer` with `SAME_ACCOUNT`, `CURRENCY_MISMATCH` or `UNKNOWN_ACCOUNT`
- [ ] Mock `listAccountTransactions?in_transit=true`
- [ ] Mock `changeTransaction` on a leg: `transfer-leg`
- [ ] E2e:
  - an ATM leg noted in Wallet shows In transit and appears under the filter;
  - cash ↔ cash shows on both Accounts, without the badge;
  - the Counterpart link;
  - axe

## Spec

[spec.md](../spec.md): stories 10–12, 21–23; "Record a Transaction" (Transfer group); "Transfer legs in Transactions".
