# 10: Reverse Transfer legs

Status: done
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

- [x] The warning choice is a small tested function, covering every row of the spec's table
- [x] The extra invalidations
- [x] The month-closed toast names the Account
- [x] Mock `reverseTransaction`, with the backend's cascade:
  - a bank leg → its row is pending again, and an automatic cash leg is reversed too, while a manual one goes back to In transit;
  - a cash leg alone → the bank leg stays Accepted, In transit;
  - cash ↔ cash → both legs reversed;
  - anything touched in a closed month → 409 with `account_id`, and nothing reversed;
  - the Match is gone in every case
- [x] E2e: each warning; the cascade's results on both Accounts; a refusal naming another Account's closed month; axe

## Spec

[spec.md](../spec.md): stories 24–25; "Reversing legs".

## Comments

- 2026-11-27: built on `build/cash-accounts-10-reverse-transfer-legs`, from main (09 is merged).
  - **The warning** is `reverseWarning` in `src/lib/transfers.ts`. It looks at the leg, its Account's kind and its Counterpart, and returns `bankLeg`, `cashLeg`, `both` or `none`. `none` covers an In transit leg, a Transaction that isn't a leg, and a Counterpart not loaded yet. Cash legs recorded by an Accept and cash legs noted by hand get the same `cashLeg`, as the spec's table says.
  - **The dialog** puts the warning in its description, so screen readers read it. A bank leg's warning already says its row goes back to To review, so it replaces the "Its Imported transaction goes back…" sentence. Names come from the Household's Accounts list.
  - **After a reversal,** `useReverse` also invalidates the Counterpart's Transactions and calls `refetchAccountReads` for it (balance, months, To review).
  - **409 `month-closed`** on any reversal: the toast's detail becomes "Purse's October 2026 is closed. Reopen it to reverse this." The Account comes from `account_id`, or the row's own Account when there is none. If the Account isn't in the list, the problem's own text is shown. The helper is `isMonthClosed` in `src/api/problem.ts`.
  - **The mock's Reverse** follows the backend's `Reverse` and `cascades` (ledger/app/corrections.go). It removes the Match and unmatches both legs. The other leg is reversed too when it's a `created_by_transfer` cash leg (and this one isn't), or when both Accounts are cash. Each reversal is checked against its Account's closed months in Account ID order. The first refusal names that Account and reverses nothing. The mock now also moves a cash Account's balance on a reversal, which it didn't before.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check;
  - unit tests: 594 passed (new: `reverseWarning` cases in `src/lib/transfers.test.ts`, Reverse cascade cases in `src/mocks/imported-transaction-handlers.test.ts`);
  - e2e: 149 passed (new: `e2e/reverse-transfer-legs.spec.ts`);
  - the image test.
