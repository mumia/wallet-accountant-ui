# 12: Real-stack smoke test: cash and an ATM Transfer

Status: needs-triage
Blocked by: 06, 07, 10
Waits on backend: no. v0.9.0 is released.

## What to build

Extend the real-stack smoke test (`smoke/`) with the cash and Transfer flow:

1. Add a cash Account "Wallet" with an Opening count, then correct it.
2. Record a cash purchase against an Expense Category.
3. Note an ATM withdrawal in Wallet as a Transfer from the bank Account, and check that it shows In transit.
4. Import a bank statement carrying the ATM row. In To review, Accept it as a Transfer to Wallet, picking the suggested leg, and check that the leg is no longer In transit.
5. Close Wallet's month with a wrong count. Use Record the difference… against an Expense Category, then close again and check that it passes.
6. Reverse the bank leg, which needs the months reopened. Check that the row is back in To review and that Wallet's manual leg is In transit again.

The cash month must have ended for step 5. Use start dates in an earlier month, as the existing smoke test does for statement months.

## Acceptance criteria

- [ ] `smoke.spec.ts` runs the steps above after the existing ones
- [ ] `make local-smoke` passes on a fresh cluster with backend v0.9.0. Note the tag in an `## Answer`

## Spec

[spec.md](../spec.md): "Testing Decisions" (real-stack smoke test).
