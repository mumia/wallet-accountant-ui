# 03: Loans and crypto wallets take no part in Transfers

Status: ready-for-agent
Blocked by: 02
Waits on backend: no, once 02 is in

## What to build

A Transfer is only between `CASH`, `BANK_ACCOUNT` and `CREDIT_CARD` Accounts, on both sides. Add `takesPartInTransfers(kind)` to `src/lib/transfers.ts` and use it:

- **To review on a loan or crypto wallet Account:** the per-row picker has no Transfer group.
- **To review on another Account:** the Transfer group never lists a loan or crypto wallet. (Today it lists cash only, so this matters once ticket 04 widens it; filter here anyway.)
- **Record a Transaction:** Other side's Transfer group lists only cash, bank and credit card Accounts in the currency (`counterparts` in `record-transaction-sheet.tsx` lists every other Account today).
- **The backstop:** a 422 `ACCOUNT_KIND_NOT_SUPPORTED` that gets through shows the problem's own `title` and `detail`, as today.

## Acceptance criteria

- [ ] `takesPartInTransfers` unit-tested for every Account kind
- [ ] No Transfer group on a loan or crypto wallet row in To review
- [ ] No loan or crypto wallet in Record a Transaction's Transfer group
- [ ] Mock: Accept as Transfer and `recordCashTransaction` refuse a loan or crypto wallet on either side with `ACCOUNT_KIND_NOT_SUPPORTED`, `account_id` naming it (the row's own Account first)
- [ ] E2e: a loan row has no Transfer group; Record a Transaction doesn't offer the loan

## Spec

[spec.md](../spec.md): story 8; "Which Accounts take part in Transfers (ticket 03)".
