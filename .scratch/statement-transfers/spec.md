# Spec: Transfers between statement Accounts (UI)

Status: ready-for-agent

This is the UI half of the backend's statement-transfers work. The backend sources are:

- its spec, `../wallet-accountant/.scratch/statement-transfers/spec.md`;
- ADR-0026, "Transfers as two Matched legs", as amended for statement Accounts, and ADR-0024's amendment on Match state in closed months;
- the hand-off, [ticket 01](issues/01-backend-hand-off.md), which lists every API change since v0.10.1.

The backend ships all of it in **v0.11.0**, tagged on the merge of mumia/wallet-accountant#52. **It isn't tagged yet.** The UI pins v0.10.1.

Domain terms come from `../wallet-accountant/internal/ledger/CONTEXT.md` and `../wallet-accountant/internal/ingestion/CONTEXT.md`. There's no new term:

- **Transfer**, **Transfer leg**, **Counterpart Account**, **Match**;
- **In transit** for a leg without a Match, and **pending** for a row waiting in To review. Both can apply at once: a leg can be In transit while the other side's row is still pending;
- **Accepted**: a row Accepted together with the other side's row is just Accepted. Screen copy says **"Accept both"**. "Pair Accept" is the backend tickets' shorthand, not a word for screens.

## Problem Statement

A Household that pays off its credit card from its bank Account, or moves money to savings, can't record it truthfully in the UI.

- **Card repayments and savings:** To review offers a Transfer only to a cash Account. So the bank's −1000 repayment is Accepted against a Category as spending, and the card's +1000 as income. The card's purchases were already counted as spending, so the same euros count twice.
- **Loans and crypto wallets:** the UI offers Transfers that the backend now refuses: a loan or crypto wallet row Accepted as a Transfer to cash, and a cash leg naming a loan or crypto wallet.
- **Suggestions:** the backend now answers `{ legs, imported_transactions }`, so the cash suggestions dialog breaks as soon as v0.11.0 is deployed.

## Solution

- **Bank and credit card Accounts as Transfer counterparts.** On a bank or card row in To review, the Transfer group lists the other cash, bank and credit card Accounts in the row's currency.
- **One dialog for the other side.** After the member picks "Transfer to Card" and presses Accept, the UI asks the backend what Card already has:
  - an **In transit leg**: Match it;
  - a **pending row**: **Accept both**, one command;
  - neither, or the member's choice: **Accept alone**. The row's leg waits In transit until Card's side arrives.
- **Loans and crypto wallets take no part in Transfers.** No Transfer group on their rows, and they aren't offered as counterparts, in To review or in Record a Transaction.
- **Reversing a statement leg** warns that the other side stays Accepted, In transit.

## User Stories

### Accepting Transfers

1. As a member, I want to Accept a card repayment row on my bank Account as a Transfer to my card Account, so that it isn't counted as spending.
2. As a member, I want to Accept a transfer to my savings Account as a Transfer, so that moving money between my own Accounts isn't spending or income.
3. As a member, I want to Accept one side of a Transfer before the other Account's statement is imported, and be told it waits In transit, so that I don't have to wait for both statements to review a month.
4. As a member, I want Accepting the second side to offer the first side's In transit leg, so that the Transfer is completed and nothing stays In transit.
5. As a member, I want to Accept both sides of a Transfer in one step when both statements are imported, so that reviewing a month doesn't mean handling every Transfer twice.
6. As a member, I want a row on the other Account whose month isn't open shown, but not choosable, with the reason, so that I know why I can't Accept both yet and can Accept alone instead.
7. As a member, I want to Accept a row as a Transfer to a bank or card Account even when that Account started after the row's date, so that money already in its Opening balance doesn't block me.
8. As a member, I want no Transfer offered on a loan or crypto wallet row, nor to a loan or crypto wallet Account, so that I don't try one the product can't handle yet.
9. As a member, I want the other Account's To review, Transactions and balance to update after Accepting both, so that its row doesn't wait for review a second time.

### Closed months and reversing

10. As a member, I want a leg in a closed month offered as a Match when its other side arrives, so that money moving across a month end can still be completed.
11. As a member reversing a leg of a Transfer between two statement Accounts, I want to be told the other side stays Accepted, In transit, so that I know what's left to fix.

## Implementation Decisions

### Contract (ticket 02)

- **Move to v0.11.0** with `make contract-update ref=v0.11.0`, once it's tagged.
- **The breaking change ships in the same ticket:** the suggestions dialog and the To review Accept flow read `legs` instead of `items`. Until this ticket merges, don't deploy backend v0.11.0 to the local cluster.
- **`COUNTERPART_NOT_CASH` is gone** from the contract; nothing in the UI names it outside the mock.
- **`ImportedTransaction.account_id`** is required now. The mock fills it on every row it returns.
- **Mocks:** the mock backend (MSW, typed by openapi-msw) answers the new suggestions shape in this ticket, with `imported_transactions: []` until ticket 05. Each later ticket extends it for what it uses.

### Which Accounts take part in Transfers (ticket 03)

**The rule:** a Transfer is only between `CASH`, `BANK_ACCOUNT` and `CREDIT_CARD` Accounts, on both sides. One helper in `src/lib/transfers.ts`, `takesPartInTransfers(kind)`, used everywhere below.

- **To review on a loan or crypto wallet Account:** the per-row picker has no Transfer group.
- **To review on any other Account:** the Transfer group never lists a loan or crypto wallet.
- **Record a Transaction** (cash Accounts): the Transfer group of Other side lists only cash, bank and credit card Accounts in the currency.
- **The backstop:** a 422 `ACCOUNT_KIND_NOT_SUPPORTED` that gets through (a stale Account list, another client) shows the problem's own `title` and `detail`, as every refused Accept does.

### Accept as Transfer to a bank or card Account (ticket 04)

**The per-row picker**

- **The Transfer group** lists every other cash, bank and credit card Account in the row's currency: "Transfer to Card" for money out, "Transfer from Card" for money in, as for cash.
- **Start dates:** `canTakeLegOn` still drops a **cash** Account that started after the row's Transaction date. Bank and card Accounts are always offered: their side gets no leg from this Accept.
- **Order:** cash Accounts first, then bank and card, each by name.
- **Bulk "Accept as"** still has no Transfer group.

**Accepting a row with a bank or card Transfer chosen**

1. Fetch `transfer-suggestions?account_id={card}`, as for cash.
2. **Nothing suggested:** Accept at once with `{transfer_account_id}`. The toast reads "Accepted as a Transfer to Card. It waits In transit until Card's side is Accepted."
3. **Something suggested:** the dialog opens (below).

**The dialog**, generalised from the cash one. One component serves both kinds.

- **Title:** "Is this already in {Account}?", for every counterpart. The cash wording "Did you already note this in Wallet?" goes, since a bank or card side is never noted by hand.
- **The choices**, a radio group, closest date first:
  - each **In transit leg**: description, date, amount. Confirming sends `match_transaction_id`.
  - each **pending row** (ticket 05).
  - **the last choice**, by the counterpart's kind:
    - cash: "No, record it in Wallet now";
    - bank or card: "Accept alone. It waits In transit until Card's side is Accepted."
- **The default pick** is the first suggestion, as today.
- **A leg in a closed month** is offered like any other: Matching it is allowed (ADR-0024, amended). The UI shows no month state on legs.
- **422 `NOT_A_MATCHING_LEG`:** as today, the dialog's alert, and the suggestions refetched.

**After Accept:** the usual toast. The counterpart's Transactions, balance and months are invalidated, for every kind, as they already are for cash.

### Accept both (ticket 05)

**Pending rows in the dialog**

- **Where:** after the legs, before the last choice, under a small heading "Pending in {Account}".
- **Each row reads** like a To review row: description, date, amount.
- **Confirming one** sends `{transfer_account_id, match_imported_transaction_id}`. The confirm button reads **"Accept both"** while a row is picked, and "Accept" otherwise.

**Rows that can't be paired yet**

The backend lists pending rows in a month that isn't open, so the UI can say why.

- **The check, client-side:** a row booked after the counterpart's `open_month` (from the Accounts list) is shown **disabled**, with the reason under it: "Card's February 2026 isn't open yet. Accept alone now, and Match it when that month opens." A pending row is never in a closed month (uploads ignore rows there, and a month can't close with pending rows), so there's no closed case.
- **The default pick** skips disabled rows. When nothing else is choosable, Accept alone is picked.
- **The backstop:** a 409 `month-not-open-yet` (or, in theory, `month-closed`) with `account_id`, when the Accounts list was stale, shows as the dialog's alert, naming the Account, and the suggestions are refetched.

**Other refusals**

- **422 `NOT_A_MATCHING_ROW`:** another Accept or a Discard took that row first. The dialog's alert, and the suggestions refetched, as for a leg.
- **`MATCH_LEG_AND_ROW`** can't happen: the UI sends one or the other.

**After Accept both**

- **Toast:** "Accepted both: Card repayment and Card's Payment."
- **Invalidated:** this Account's reads as usual, plus the counterpart's To review (its row is gone), Transactions, balance and months.

### Reversing a statement leg (ticket 06)

`reverseWarning` gains a fourth kind, **`statementLeg`**: a Matched leg on a statement Account whose Counterpart is a statement Account too.

| Leg | Warning |
|---|---|
| A statement leg, statement Counterpart, Matched | "Its row goes back to To review. {Counterpart}'s side stays Accepted, In transit." |
| A bank leg, cash Counterpart (unchanged) | "Its row goes back to To review. If Wallet's side was recorded by this Accept, it's reversed too. If you noted it by hand, it stays, In transit." |
| An In transit leg (no `match_id`) | no extra warning, as today |

After a reversal, the Counterpart's Transactions, balance and months are invalidated, as they already are. Its To review doesn't change: its row stays Accepted.

### Unchanged, but worth knowing

- **Transactions:** a statement leg already reads "Transfer to Card" / "Transfer from Bank" with an In transit badge, and In transit only works on every Account kind.
- **Months:** `transfer_legs_in_transit` already shows on every kind, as information.
- **Record a Transaction:** the note under a statement Counterpart ("This stays In transit until Bank's statement row is Accepted as this Transfer") still holds.
- **Find the other side without naming the Account** (backend story 9): not built. Suggestions are always asked with `account_id`. See "Out of Scope".

### Strings and accessibility

- **Strings:** every string goes in the English message files.
- **The dialog:** the choices stay one real radio group. Disabled rows are disabled radios with their reason tied to them by `aria-describedby`.
- **axe** runs on the dialog with legs, rows, disabled rows and Accept alone.

## Testing Decisions

**Same bar as the earlier slices**

Drive the UI by role, label and keyboard. Assert on what the member sees and what goes over the network. Never mock the API client.

**Unit tests**

- **`takesPartInTransfers`** for every Account kind.
- **The Transfer group** of a row: kinds, currency, cash start dates, order.
- **Row pairing state:** choosable or not open yet, from the row's Booking month and the counterpart's Open month.
- **`reverseWarning`** for each kind of leg, `statementLeg` included.

**E2e (Playwright with MSW and axe)**

- **Contract move (02):** the cash suggestions flow still passes reading `legs`.
- **Kinds (03):** no Transfer group on a loan row; no loan or crypto wallet in a bank row's group or in Record a Transaction.
- **Bank or card counterpart (04):**
  - no suggestion: Accepted alone, toast says In transit, the leg shows In transit on the bank Account;
  - an In transit leg on the card suggested and picked: both legs share a Match;
  - Accept alone chosen despite a suggestion;
  - a card that started after the row is still offered.
- **Accept both (05):**
  - picked: both rows Accepted, the card's To review no longer lists its row, nothing In transit;
  - a row in a month not open yet: disabled with its reason;
  - the row taken first (`NOT_A_MATCHING_ROW`): alert and refetch.
- **Reverse (06):** each leg of a pair: the warning, then the other leg In transit and only the reversed row back in To review.

**Mock backend**

- `listTransferSuggestions`: legs on any eligible counterpart, pending rows on bank and card counterparts, ±7 days, opposite amount, closest first; `ACCOUNT_KIND_NOT_SUPPORTED` for a loan or crypto wallet on either side.
- Accept as Transfer: a statement counterpart records only the row's leg; `match_transaction_id` on a statement leg; `match_imported_transaction_id` with `NOT_A_MATCHING_ROW` and the paired row's month refusals; `ACCOUNT_KIND_NOT_SUPPORTED`.
- `recordCashTransaction`: `ACCOUNT_KIND_NOT_SUPPORTED` for a loan or crypto wallet counterpart.
- Reverse: a statement leg never cascades to the other statement leg.

**Real-stack smoke test (ticket 07)**

The card repayment flow against backend v0.11.0.

## Out of Scope

- **Finding the other side without naming the Account** (backend stories 9 and 11): a "Find the other side…" action asking suggestions without `account_id`, across Accounts. Decided 2026-11-28: picker first only. The backend supports it, so it's UI work alone when wanted.
- **Transfers with a loan or crypto wallet Account,** on either side, cash included: a later backend feature.
- **A standalone "Match these two legs" action.** Two legs left In transit by mistake are fixed by reversing one and Accepting it again while its month is open.
- **Transfers in bulk Accept,** and pointing out likely Transfers at import time.
- **Picking a leg or row that wasn't suggested.** The backend has no date window when confirming, but the dialog offers only suggestions, as for cash.
- **A Match view** (`getMatch`).

## Tickets

| # | Ticket | Blocked by | Backend |
|---|---|---|---|
| 01 | [Backend hand-off](issues/01-backend-hand-off.md) | | resolved by this spec |
| 02 | [Move the contract to v0.11.0](issues/02-move-the-contract-to-v0.11.0.md) | | waits for v0.11.0 |
| 03 | [Loans and crypto wallets take no part in Transfers](issues/03-no-transfers-with-loans-or-crypto.md) | 02 | v0.11.0 |
| 04 | [Accept as a Transfer to a bank or card Account](issues/04-transfer-to-a-statement-account.md) | 03 | v0.11.0 |
| 05 | [Accept both rows of a Transfer](issues/05-accept-both.md) | 04 | v0.11.0 |
| 06 | [Warn when reversing a statement leg](issues/06-reverse-a-statement-leg.md) | 04 | v0.11.0 |
| 07 | [Real-stack smoke test: a card repayment](issues/07-smoke-test-a-card-repayment.md) | 05, 06 | v0.11.0 |

**Parallel work:** after 04, tickets 05 and 06 can run in parallel. Both touch `src/mocks/`, so expect merge conflicts there.

## Further Notes

**Decided on 2026-11-28**

- Picker first: suggestions are always asked with the counterpart named. "Find the other side" is out of scope.
- One dialog for every counterpart kind, retitled "Is this already in {Account}?".
- With nothing suggested, a bank or card Transfer is Accepted alone at once, as a cash one is Accepted with its automatic leg: the toast says it waits In transit.
- Rows that can't be paired yet are shown disabled with the reason, worked out from the Accounts list's `open_month`, rather than hidden or left to the backend's refusal.
- The contract move and the `legs` read are one ticket, because v0.11.0 breaks the old read.

**Ticket 01** is resolved by this spec.
