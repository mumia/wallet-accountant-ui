# 10: Reverse Transfer legs

Status: needs-triage
Blocked by: 09
Waits on backend: no

## What to build

**The reverse dialog** adds the warning from the spec's table, chosen by the leg being reversed:

- a bank leg;
- a cash leg recorded by an Accept, or by hand;
- either leg of a cash ↔ cash Transfer;
- an In transit leg, which gets no warning.

**After a reversal:** the Counterpart Account's Transactions, balance, months and To review are invalidated too.

**409 `month-closed`** (any reversal) names the Account from `account_id` and the month: "Wallet's January 2026 is closed. Reopen it to reverse this."

## Acceptance criteria

- [ ] The warning choice is a small tested function, covering every row of the spec's table
- [ ] The extra invalidations
- [ ] The month-closed toast names the Account
- [ ] Mock `reverseTransaction`, with the backend's cascade:
  - a bank leg → its row is pending again, and an automatic cash leg is reversed too, while a manual one goes back to In transit;
  - a cash leg alone → the bank leg stays Accepted, In transit;
  - cash ↔ cash → both legs reversed;
  - anything touched in a closed month → 409 with `account_id`, and nothing reversed;
  - the Match is gone in every case
- [ ] E2e: each warning; the cascade's results on both Accounts; a refusal naming another Account's closed month; axe

## Spec

[spec.md](../spec.md): stories 24–25; "Reversing legs".
