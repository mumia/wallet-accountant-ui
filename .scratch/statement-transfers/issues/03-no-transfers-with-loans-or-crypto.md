# 03: Loans and crypto wallets take no part in Transfers

Status: done
Blocked by: 02
Waits on backend: no. v0.11.0 is pinned by 02.

## What to build

A Transfer is only between `CASH`, `BANK_ACCOUNT` and `CREDIT_CARD` Accounts, on both sides. Add `takesPartInTransfers(kind)` to `src/lib/transfers.ts` and use it:

- **To review on a loan or crypto wallet Account:** the per-row picker has no Transfer group.
- **To review on another Account:** the Transfer group never lists a loan or crypto wallet. (Today it lists cash only, so this matters once ticket 04 widens it; filter here anyway.)
- **Record a Transaction:** Other side's Transfer group lists only cash, bank and credit card Accounts in the currency (`counterparts` in `record-transaction-sheet.tsx` lists every other Account today).
- **The backstop:** a 422 `ACCOUNT_KIND_NOT_SUPPORTED` that gets through shows the problem's own `title` and `detail`, as today.

## Acceptance criteria

- [x] `takesPartInTransfers` unit-tested for every Account kind
- [x] No Transfer group on a loan or crypto wallet row in To review
- [x] No loan or crypto wallet in Record a Transaction's Transfer group
- [x] Mock: Accept as Transfer and `recordCashTransaction` refuse a loan or crypto wallet on either side with `ACCOUNT_KIND_NOT_SUPPORTED`, `account_id` naming it (the row's own Account first)
- [x] E2e: a loan row has no Transfer group; Record a Transaction doesn't offer the loan

## Spec

[spec.md](../spec.md): story 8; "Which Accounts take part in Transfers (ticket 03)".

## Comments

- 2026-11-28: built on `build/statement-transfers-03-no-loan-or-crypto-transfers`, from ticket 02's branch (#64, not merged yet).
  - **The rule in the UI:** `takesPartInTransfers(account)` in `src/lib/transfers.ts`: cash, bank and credit card only. A kind this build doesn't know (`AccountKind` is an open enum) takes no part.
  - **To review:** when the tab's own Account takes no part, the row picker's Transfer group is empty, so it isn't shown. Counterparts are filtered by the rule too, although they're still cash-only until ticket 04.
  - **Record a Transaction:** `counterparts` keeps only Accounts that take part.
  - **The mock** has the backend's rule in its own module, `src/mocks/transfer-kinds.ts`, not the UI's helper, so a filtering bug in the UI can't hide behind the mock. Its checks run in the backend's order: same Account, unknown Account, currency, then the kind rule (the row's own Account named first). It covers Accept as Transfer, suggestions with and without `account_id`, and a cash leg naming a loan or crypto wallet.
  - **Tests:** unit tests for `takesPartInTransfers` and four mock refusals; e2e `transfer-kinds.spec.ts` gives a loan a statement through the mock API (Connection, preview, confirm), then checks its row has no Transfer group and that Record a Transaction doesn't offer it. Both e2e tests failed against the build without this change.
- 2026-11-28: `make check` passed: lint, typecheck, 615 unit tests, build, audit, the contract check against v0.11.0, 153 of 153 e2e, and the image test. PR #65, stacked on ticket 02's branch.

