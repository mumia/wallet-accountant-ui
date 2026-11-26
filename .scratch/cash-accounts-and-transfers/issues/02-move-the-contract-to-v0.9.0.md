# 02: Move the contract to backend v0.9.0

Status: in-review
Blocked by: —
Waits on backend: no. v0.9.0 is released.

## What to build

Move `src/api/CONTRACT_VERSION` from `v0.7.0` to `v0.9.0` with `make contract-update ref=v0.9.0`, and keep the app working:

- **v0.8.0** didn't change the contract.
- **v0.9.0** is the contract for cash Accounts and Transfers. [Ticket 01](01-backend-hand-off.md) lists every change.

No new screen comes in this ticket.

**The one schema change:** Accept's 422 is now `TransferProblem`, a `Problem` plus an optional `reason`. Everything else is additive.

## Acceptance criteria

- [x] `make contract-update ref=v0.9.0`, and `schema.gen.ts` regenerated
- [x] `src/components/account-labels.ts` learns `CASH` ("Cash"), so the contract test passes. Add Account still doesn't offer Cash: ticket 04 does that
- [x] Code reading Accept's 422 compiles against `TransferProblem`, with no change in behaviour
- [x] Mock:
  - the seeded Internal Categories gain "Account transfer";
  - `AccountKind` accepts `CASH` in types, but the `POST …/accounts` mock still refuses it until ticket 04
- [ ] `make check` passes: the contract check against v0.9.0, and the image's `min-api-version` v0.9.0

## Spec

[spec.md](../spec.md): "Contract".

## Comments

- 2026-11-26: built on `build/cash-accounts-02-contract-v0.9.0`.
  - **Contract:** `make contract-update ref=v0.9.0` copied the contract and regenerated `schema.gen.ts`. The only type error was the mock's `AccountMonth`, which now counts `transfer_legs_in_transit`: legs in the month with no `match_id` that aren't reversed. It's 0 until ticket 08 adds legs.
  - **Accept's 422:** the `TransferProblem` change needed no code change, because Accept's errors go through `errorText` like any other problem.
  - **Labels:** `kindKeys` gained `CASH` ("Cash"). Add Account filters it out until ticket 04, and the mock's `POST …/accounts` still refuses it.
  - **Categories:** "Account transfer" was added to the mock's Internal Categories and to the shared test tree (`src/test/categories.ts`), so the picker tests already show that it's never offered.
