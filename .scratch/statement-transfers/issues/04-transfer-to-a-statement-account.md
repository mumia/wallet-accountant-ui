# 04: Accept as a Transfer to a bank or card Account

Status: ready-for-agent
Blocked by: 03
Waits on backend: no, once 02 is in

## What to build

**The per-row picker** in To review: the Transfer group lists every other cash, bank and credit card Account in the row's currency, "Transfer to Card" or "Transfer from Card" by the row's sign. `canTakeLegOn` still drops a cash Account started after the row's Transaction date; bank and card Accounts are always offered. Cash first, then bank and card, each by name. Bulk "Accept as" still has no Transfer group.

**Accepting with a bank or card Transfer chosen**

1. Fetch `transfer-suggestions?account_id={card}`.
2. **Nothing suggested:** Accept with `{transfer_account_id}`. Toast: "Accepted as a Transfer to Card. It waits In transit until Card's side is Accepted."
3. **Legs suggested:** the dialog.

**The dialog**, one component for every counterpart kind:

- title "Is this already in {Account}?" (replacing "Did you already note this in Wallet?");
- the In transit legs as radios, closest first; confirming one sends `match_transaction_id`;
- the last choice: "No, record it in Wallet now" for cash, "Accept alone. It waits In transit until Card's side is Accepted." for bank or card;
- a leg in a closed month is offered like any other;
- 422 `NOT_A_MATCHING_LEG`: alert and refetch, as today.

**After Accept:** the counterpart's Transactions, balance and months are invalidated, for every kind.

## Acceptance criteria

- [ ] The picker's Transfer group, as above, unit-tested (kinds, currency, cash start dates, order)
- [ ] The Accept flow and dialog wording, as above
- [ ] Mock suggestions: In transit legs on any eligible counterpart (cash, bank or card)
- [ ] Mock Accept with a bank or card counterpart: records only the row's leg, In transit; `match_transaction_id` Matches a statement leg; no start-date check
- [ ] E2e: Accepted alone with the In transit toast and leg; a suggested leg picked, both legs Matched; Accept alone despite a suggestion; a card started after the row is offered; axe on the dialog
- [ ] The cash flow's e2e still passes with the new title

## Spec

[spec.md](../spec.md): stories 1–4, 7, 10; "Accept as Transfer to a bank or card Account (ticket 04)".
