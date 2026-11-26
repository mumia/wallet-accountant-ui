# 02: Move the contract to backend v0.9.0

Status: needs-triage
Blocked by: —
Waits on backend: no. v0.9.0 is released.

## What to build

Move `src/api/CONTRACT_VERSION` from `v0.7.0` to `v0.9.0` with `make contract-update ref=v0.9.0`, and keep the app working:

- **v0.8.0** didn't change the contract.
- **v0.9.0** is the contract for cash Accounts and Transfers. [Ticket 01](01-backend-hand-off.md) lists every change.

No new screen comes in this ticket.

**The one schema change:** Accept's 422 is now `TransferProblem`, a `Problem` plus an optional `reason`. Everything else is additive.

## Acceptance criteria

- [ ] `make contract-update ref=v0.9.0`, and `schema.gen.ts` regenerated
- [ ] `src/components/account-labels.ts` learns `CASH` ("Cash"), so the contract test passes. Add Account still doesn't offer Cash: ticket 04 does that
- [ ] Code reading Accept's 422 compiles against `TransferProblem`, with no change in behaviour
- [ ] Mock:
  - the seeded Internal Categories gain "Account transfer";
  - `AccountKind` accepts `CASH` in types, but the `POST …/accounts` mock still refuses it until ticket 04
- [ ] `make check` passes: the contract check against v0.9.0, and the image's `min-api-version` v0.9.0

## Spec

[spec.md](../spec.md): "Contract".
