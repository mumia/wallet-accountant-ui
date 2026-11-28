# 01: Backend hand-off: Transfers between statement Accounts

Status: resolved
Blocked by: —
Waits on backend: yes. `v0.11.0` isn't tagged yet (see "Tag to pin").

## Why

Until now a Transfer needed a cash Account on one side. So a Household couldn't record a card repayment or a move to savings truthfully. The bank row had to be Accepted against a Category, and the card's own +1000 row too. The repayment then counted as spending on the bank and as income on the card, although no money left the Household. The card's purchases were already counted as spending, so the same euros counted twice.

The backend now takes **bank ↔ bank** and **bank ↔ credit card** Transfers. Each side is a row on its own Account's statement, Accepted as a Transfer leg, and the two legs are Matched.

This note lists what changed in the API since `v0.10.1`, so the UI spec for this feature can be written from it. The backend's own spec is `../wallet-accountant/.scratch/statement-transfers/spec.md`. The decision is ADR-0026, "Transfers as two Matched legs", now amended, in `../wallet-accountant/docs/adr/`.

## First: one breaking change

**`listTransferSuggestions` now answers `{ legs, imported_transactions }`, not `{ items }`.** The cash flow reads `suggestions.data?.items` (`src/features/to-review/transfer-suggestions-dialog.tsx`); it must read `legs` instead. The UI change and the contract update (`v0.10.1` → `v0.11.0`) have to ship together. **Don't deploy backend `v0.11.0` to the local cluster ahead of that UI change**, or the cash suggestions dialog breaks. Production isn't running yet, so nothing else is affected.

## Tag to pin

Pin **`v0.11.0`**: the backend spec tags the merge of its contract ticket with it, and tickets 02–04 build on that contract. **It isn't tagged yet**: the backend's `statement-transfers` branch isn't merged, and the last tag is `v0.10.1`. If the tag ends up on a commit without the pair Accept (`match_imported_transaction_id` answering 501), pin the first release that has backend ticket 04 instead. When it exists: `make contract-update ref=<tag>`.

## Words to use

The backend glossary gains no new term. Keep using (`../wallet-accountant/internal/ledger/CONTEXT.md`, `../wallet-accountant/internal/ingestion/CONTEXT.md`):

- **Statement Account**: any Account that isn't cash (bank, credit card, loan, crypto wallet). Only bank and credit card take part in Transfers for now.
- **Transfer leg**, **Counterpart Account**, **Match**: as before. Between two statement Accounts, each leg comes from its own Account's statement.
- **In transit**: a leg with no Match yet. **Pending** stays Ingestion's word for a row waiting for review. Here both words apply at once: a leg can be In transit while the other side's row is still pending.
- **Accepted**: a row that both sides Accept in one command is just Accepted. There is no new row state. The backend's tickets call this a "pair Accept", but it isn't a glossary term, so screen copy should say something like "Accept both".

## Rules the UI must reflect

- **Bank and credit card Accounts can be Transfer counterparts.** On a bank or card row, offer a Transfer to any other cash, bank or credit card Account in the row's currency. Today To review offers cash Accounts only (`cashByCurrency` in `src/features/to-review/to-review-tab.tsx`).
- **No automatic leg for a statement counterpart.** Accepting a row as a Transfer to a bank or card Account books **only the row's own leg**. The counterpart's balance doesn't move. Its leg can only come from its own statement. So there are three ways to Accept:
  - **Alone:** the row's leg is In transit until the other side arrives. This is right when the other statement isn't imported yet.
  - **Matched to a leg:** the other side was already Accepted alone and is In transit. Send `match_transaction_id`. This is the existing field, now for bank and card legs too.
  - **Together with a pending row:** both statements are imported and the other side's row is still pending. Send `match_imported_transaction_id`: one command Accepts both rows, books both legs and confirms their Match.
- **No start-date check for a statement counterpart.** The `BEFORE_START_DATE` rule and `canTakeLegOn` stay cash-only. A bank row dated before the card Account started is Accepted, and its leg may stay In transit for good if that money is already in the card's Opening balance.
- **No Transfer with a loan or crypto wallet Account, on either side, cash included.** This is new for cash: the UI offered cash Transfers on loan and crypto wallet rows before, and the backend now refuses them. Specifically:
  - on a loan or crypto wallet row, offer no Transfer at all;
  - never list a loan or crypto wallet as a counterpart, in To review or in Record a Transaction (whose `counterparts` today is every other Account in the currency, `src/features/transactions/record-transaction-sheet.tsx`).
  Loans and crypto wallets get their own feature later.
- **Reversing a statement leg leaves the other In transit.** Reversing either leg removes the Match. The other leg stays booked, In transit, even in a closed month. Only the reversed leg's row goes back to pending. This holds however the two were Accepted. Nothing cascades, so no cascade warning is needed (`created_by_transfer` is never set on a statement leg).
- **A leg in a closed month can still be Matched or unmatched.** A Match moves no money, so closing a month doesn't lock it. A bank leg Accepted alone on 31 March, with March then closed, is Matched when the card's 2 April row is Accepted. Don't block Matching to a leg because its month is closed.
- **Both rows of a pair must be in their own Account's Open month.** If the other row's month is closed or not open yet, the pair is refused (`month-not-open-yet` or `month-closed`, naming that Account in `account_id`). The backend doesn't fall back to Accepting alone. Suggestions still list such rows, so the UI can say why it can't pair them, or offer Accept alone instead.
- **No date window when confirming.** As with `match_transaction_id`, any pending row on the counterpart with the exact opposite amount can be paired, suggested or not.
- **Exact opposite amounts only.** A row with a fee taken inside it isn't a Transfer; it's Accepted with a Category.

## API changes since v0.10.1

### Changed

- **`listTransferSuggestions`** (`GET /households/{h}/imported-transactions/{row}/transfer-suggestions`):
  - **Breaking:** answers the new **`TransferSuggestionList`** `{ legs: Transaction[], imported_transactions: ImportedTransaction[] }`, both always present, each closest date first, then by ID. It replaces `TransactionList`.
  - **`account_id` is optional.** Without it, suggestions come from every eligible counterpart: the Household's other cash, bank and credit card Accounts in the row's currency. With it, only from that Account.
  - `legs`: In transit legs on those Accounts naming the row's Account, with the opposite amount, Transaction date within ±7 days.
  - `imported_transactions`: **pending** rows on the bank and credit card Accounts among them, with the opposite amount, within ±7 days. Undecided Suspected duplicates aren't pending and aren't listed. Rows in a month that isn't open **are** listed.
  - A row on a loan or crypto wallet, or an `account_id` that is one: 422 `ACCOUNT_KIND_NOT_SUPPORTED`.
- **`ImportedTransaction`** gains a required **`account_id`**: the Account whose statement the row is on. It's on every response carrying a row (listing, Accept, Keep, Discard, suggestions), so a suggested row from another Account can be labelled.
- **`acceptImportedTransaction`** (`ImportedTransactionAcceptance`):
  - `transfer_account_id` now takes a bank or credit card Account, as well as cash.
  - New **`match_imported_transaction_id`**: a pending row on `transfer_account_id`, Accepted in the same command. The response is still only **this** row's `ImportedTransaction`; re-read the other Account's rows to see the paired one Accepted.
  - `match_transaction_id` now also names an In transit leg on a bank or card Account.
- **`recordCashTransaction`** with a loan or crypto wallet `counterpart_account_id`: 422 `ACCOUNT_KIND_NOT_SUPPORTED`.
- **`MonthProblem.account_id`** is now also set on `month-not-open-yet` when the month is the paired row's Account's, as it already was on `month-closed`.

### New `invalid-transfer` reasons

- `ACCOUNT_KIND_NOT_SUPPORTED`: a loan or crypto wallet on either side of a Transfer, whatever the other side is. **It replaces `COUNTERPART_NOT_CASH`, which is gone.** `account_id` names the refused Account; the row's own Account is checked first.
- `MATCH_LEG_AND_ROW`: both `match_transaction_id` and `match_imported_transaction_id` were sent.
- `NOT_A_MATCHING_ROW`: `match_imported_transaction_id` isn't another pending row on `transfer_account_id` with the exact opposite amount in the same currency. That covers a row on another Account, one already Accepted or Discarded, an undecided Suspected duplicate, the row itself, another amount, or a row that doesn't exist.

Unchanged: `MATCH_WITHOUT_TRANSFER` now covers either match field, and `CATEGORY_AND_TRANSFER`, `SAME_ACCOUNT`, `CURRENCY_MISMATCH`, `UNKNOWN_ACCOUNT`, `NOT_A_MATCHING_LEG` and `BEFORE_START_DATE` (cash only) keep their meaning. There are no new operations and no new problem types.

## Flows, with examples

Amounts are `Money`: `{"amount": "1000.00", "currency": "EUR"}`. Responses are trimmed to the new or relevant fields. `{bank}` has a −1000.00 "Card repayment" row on 2026-01-01; `{card}` has a +1000.00 "Payment" row on 2026-01-02.

### Suggestions without naming the Account

```http
GET /api/households/{h}/imported-transactions/{bank-row}/transfer-suggestions

200 {"legs": [{"transaction_id": "{leg}", "account_id": "{wallet}", "transaction_date": "2026-01-01",
               "amount": {"amount": "1000.00", …}, "counterpart_account_id": "{bank}", …}],
     "imported_transactions": [{"imported_transaction_id": "{card-row}", "account_id": "{card}",
                                "state": "PENDING", "transaction_date": "2026-01-02",
                                "amount": {"amount": "1000.00", …}, "description": "Payment", …}]}
```

A leg means "Match it" (`match_transaction_id`). A row means "Accept both" (`match_imported_transaction_id`). `account_id` on each says which Account it's on.

### Accept alone (the card statement isn't imported yet)

```http
POST /api/households/{h}/imported-transactions/{bank-row}/accept
{"transfer_account_id": "{card}"}

200 {"imported_transaction_id": "{bank-row}", "account_id": "{bank}", "state": "ACCEPTED", …}
```

The bank balance moves by −1000.00 and the card's doesn't. The bank leg shows under `listAccountTransactions?in_transit=true`, with `counterpart_account_id: {card}` and no `match_id`.

### Accept with `match_transaction_id` (later, once the card statement is in)

```http
POST /api/households/{h}/imported-transactions/{card-row}/accept
{"transfer_account_id": "{bank}", "match_transaction_id": "{bank-leg}"}

200 {"imported_transaction_id": "{card-row}", "account_id": "{card}", "state": "ACCEPTED", …}
```

Both legs now share a `match_id`, and `GET /matches/{match_id}` lists both. This works even if `{bank-leg}`'s month was closed in between.

### Accept both rows together

```http
POST /api/households/{h}/imported-transactions/{bank-row}/accept
{"transfer_account_id": "{card}", "match_imported_transaction_id": "{card-row}"}

200 {"imported_transaction_id": "{bank-row}", "account_id": "{bank}", "state": "ACCEPTED", …}
```

Both rows are Accepted, both balances move, both legs share one `match_id`, and nothing is In transit. Each leg carries its own row's dates, description and payee. If another Accept took `{card-row}` first, the answer is 422 `NOT_A_MATCHING_ROW` (or a 409 if the race is caught as a conflict), and neither row is booked.

### A pair refused for the other row's month

The card row is dated 2026-02-02 while the card's Open month is January:

```http
POST /api/households/{h}/imported-transactions/{bank-row}/accept
{"transfer_account_id": "{card}", "match_imported_transaction_id": "{card-feb-row}"}

409 {"type": "/problems/month-not-open-yet", "title": "Month not open yet",
     "detail": "February 2026 isn't open yet. Close January 2026 first.",
     "booking_month": "2026-02", "open_month": "2026-01", "account_id": "{card}"}
```

Nothing is booked and both rows stay pending. The member can Accept the bank row alone now and Match it when February opens on the card.

### Refused kinds

```http
POST /api/households/{h}/imported-transactions/{loan-row}/accept
{"transfer_account_id": "{wallet}"}

422 {"type": "/problems/invalid-transfer", "reason": "ACCOUNT_KIND_NOT_SUPPORTED", "account_id": "{loan}", …}
```

## Not in this release

- Transfers with a loan or crypto wallet Account (loan interest, crypto statements): a later feature.
- A standalone "Match these two legs" command. Two legs left In transit by mistake are fixed by reversing one and Accepting it again while its month is open.
- Transfers whose amounts differ (a fee inside the row), or between currencies.
- Pointing out likely Transfers at import time: suggestions are asked for row by row.
- Household transfers, split Transactions, and Matching a manual entry to an Imported transaction.

## Answer

Resolved on 2026-11-28 by [spec.md](../spec.md), written from this hand-off. Decided with the user: suggestions are asked with the counterpart named (picker first), so "Find the other side" without naming the Account (backend stories 9 and 11) is out of scope for now. Ticket 02 pins v0.11.0 once it's tagged.

