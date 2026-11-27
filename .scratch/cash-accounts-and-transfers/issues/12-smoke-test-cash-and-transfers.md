# 12: Real-stack smoke test: cash and an ATM Transfer

Status: done
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

- [x] `smoke.spec.ts` runs the steps above after the existing ones
- [x] `make local-smoke` passes on a fresh cluster with backend v0.9.0. Note the tag in an `## Answer`

## Spec

[spec.md](../spec.md): "Testing Decisions" (real-stack smoke test).

## Answer

Done on 2026-11-27. `make local-smoke` passed on a fresh cluster with the backend at **v0.10.0** (fd8fb62), which is the contract version since ticket 11, rather than v0.9.0. The browser test took 25 s and the whole run 643 s. Every step passed: Wallet added and its Opening count corrected, the cash purchase, the ATM leg In transit, the bank's ATM row Accepted as that Transfer (no longer In transit), Wallet's month closed after Record the difference…, and the bank leg reversed once its month was reopened (row back To review, Wallet's leg In transit again).

## Comments

- 2026-11-27: built on `build/cash-accounts-12-smoke-test`, from main (10 is merged).
  - **One test still.** The new steps follow the bell step, because they need the first User's Household and bank Account. The test is now allowed 480 s, up from 300 s.
  - **Dates.** Wallet starts on the 1st of last month. Its purchase is on the 5th of last month and the ATM withdrawal on the 25th, so the month has ended and can close by a count (Counted on today).
  - **The ATM row is in last month too**, and last month was already closed on the bank Account. A statement's rows in a closed month aren't imported, so the step reopens the bank's last month first. It imports a one-row statement (Export balance €2,900.00, no Opening balance this time), Accepts the row as a Transfer to Wallet picking the suggested leg, and closes the month again.
  - **Close Wallet's month:** the books say €147.50 (€60.00 corrected count, −€12.50 purchase, +€100.00 ATM). The count is €140.00, so the refusal shows −€7.50. Record the difference… records it against Groceries, and the second close passes.
  - **Reverse "needs the months reopened".** The Transactions list offers no Reverse… on a row in a closed month, so the step checks the bank leg has no Actions, reopens the bank's last month and reverses. It checks the bank-leg warning, that the row is back in To review, and that Wallet's manual leg is In transit again. Only the bank's month needs reopening. In the backend, a leg posts only to its own Account, and unmatching the other leg doesn't check closed months (`Transactions.Reverse` in ledger/app/corrections.go). Wallet's last month stays closed.
  - **Backend tag:** the contract is now v0.10.0 (ticket 11), not v0.9.0, so run the smoke test with the backend at **v0.10.0**.
- 2026-11-27: `make lint` and `make typecheck` passed. Both cover `smoke/`.
- 2026-11-27: the first `make local-smoke` failed in the existing first step, before any new step ran. The Household's Name was typed, then dropped: the form rendered fresh as `/households/new`'s `/currencies` loader settled, about 8 ms after the fill. The Base currency, typed after it, stayed. The step now types both again until both values hold, then clicks Create Household. The second run passed (see `## Answer`).
