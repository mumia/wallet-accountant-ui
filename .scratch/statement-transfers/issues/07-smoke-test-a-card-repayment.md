# 07: Real-stack smoke test: a card repayment

Status: ready-for-agent
Blocked by: 05, 06
Waits on backend: yes, v0.11.0 on the local cluster

## What to build

Extend the real-stack smoke test (`smoke/`) with a card repayment:

1. Add a credit card Account "Card" with a Connection, and import a card statement with a +amount "Payment" row, besides the bank statement whose row repays it.
2. In the bank's To review, Accept the repayment row as a Transfer to Card, choosing **Accept both** with the card's Payment row.
3. Check that Card's To review no longer lists Payment, both balances moved, and neither Account has a leg In transit.
4. Reverse the card leg. Check that the bank leg is In transit and Payment is back in Card's To review.
5. Accept Payment again, Matching the bank's In transit leg, and check nothing is In transit.

## Acceptance criteria

- [ ] `smoke.spec.ts` runs the steps above after the existing ones
- [ ] `make local-smoke` passes on a fresh cluster with backend v0.11.0. Note the tag in an `## Answer`

## Spec

[spec.md](../spec.md): "Testing Decisions" (real-stack smoke test).
