# 01: The mock API refuses a Transfer leg before its cash Account's start date

Status: done
Blocked by: —
Waits on backend: no. `v0.10.1` is released.

## How it was found

2026-11-27: Accepting a bank row dated 2026-11-02 as a Transfer to a cash Account that started on 2026-11-27 got a 500. The cash leg is booked on the row's Transaction date, and a cash Account holds no money before its start date. The backend will answer 422 `/problems/invalid-transfer` with `reason` `BEFORE_START_DATE` and `account_id` set to the cash Account.

## Done already (PR #60)

- To review: a row's Transfer group leaves out any cash Account whose `start_date` is after the row's `transaction_date` (`canTakeLegOn`, `src/lib/transfers.ts`).
- Record a Transaction: a cash Counterpart that hadn't started by the chosen date gets a message on Other side, and the form won't save until the date or the Counterpart changes.
- A 422 that gets through anyway (a stale Account list, another client) already shows the problem's own `title` and `detail` (`errorText`).

## What's left

Once the contract has `BEFORE_START_DATE`:

- [x] `make contract-update ref=<tag>`.
- [x] `src/mocks/imported-transaction-handlers.ts`: Accept as Transfer of a row whose Transaction date is before the cash Account's start date answers 422 `BEFORE_START_DATE` with `account_id`, after the existing `invalid-transfer` checks and month 409s, as the backend orders them. Add a `transferDetails` entry with the backend's wording.
- [x] `src/mocks/transaction-handlers.ts`: the same for a cash ↔ cash Transfer whose date is before the Counterpart's start date. A date before the Account's own start date stays `invalid-transaction`.
- [x] Mock handler tests for both, and for a date on the start date being accepted.

## Comments

2026-11-27: Done on `build/mock-before-start-date`. The mock details copy the backend's v0.10.1 wording, both dates included. Cash ↔ cash checks the Account's own start date before either leg, as `recordCashLeg` does.
