# 01: Backend hand-off: cash Accounts and Transfers

Status: resolved
Blocked by: —
Waits on backend: no. v0.9.0 is released.

## Why

The backend now supports **cash Accounts** and **Transfers** between Accounts. Before this, a Household couldn't track its cash at all. Worse, an ATM withdrawal could only be Accepted against a spending Category, so once cash purchases were recorded too, every euro spent in cash would count twice.

This note lists what changed in the API since `v0.8.0`, so the UI spec for this feature can be written from it. The backend's own spec is `../wallet-accountant/.scratch/cash-accounts-and-transfers/spec.md`. The decision behind Transfers is ADR-0026, "Transfers as two Matched legs", in `../wallet-accountant/docs/adr/`.

## Tag to pin

Pin the first backend release cut after the `cash-accounts-and-transfers` branch merges. It contains tickets 02–09. **It isn't tagged yet**: the last tag is `v0.8.0`, and the backend spec planned `v0.9.0` for this contract. When it exists, update the contract with `make contract-update ref=<tag>`.

## Words to use

Use these terms as the backend glossary defines them (`../wallet-accountant/internal/ledger/CONTEXT.md`), and avoid the listed synonyms:

- **Cash Account**: an Account kept entirely by hand, with no statement; its truth is a count. Every other kind is a statement Account.
- **Opening count**: the cash counted on a cash Account's start date, typed twice. Avoid "initial cash".
- **Cash count**: the amount counted and the day it was counted, which closes a cash month. Avoid "cash balance".
- **Transfer**: money moving between two of the Household's Accounts. Avoid "movement" and "internal payment".
- **Transfer leg**: one side of a Transfer: a Transaction on one Account, against the Account transfer Category, naming the other Account.
- **Counterpart Account**: the other Account a leg names.
- **In transit**: a leg with no Match yet that isn't reversed. **Avoid "pending"**, which is the word for Imported transactions.
- **Account transfer**: the new Internal Category on the other side of every leg. It is reached only through a Transfer, never picked from the Category list.

## Rules the UI must reflect

- **Manual entry is for cash only.** A bank, card, loan or crypto Account takes Transactions only from its statements: offer "Record a Transaction" on cash Accounts only. A cash Account takes no Connection and no Statement import.
- **Opening count, typed twice.** Adding a cash Account asks for the count twice. A cash Account has a balance at once; it never awaits a first Statement import. The count can be corrected (`recountOpening`) only while the start month is still the open month.
- **Cash dates.** A cash Transaction has one `date`, used as both Booking date and Transaction date. It can't be after today (UTC). It can be in the open month or **any later month**: a member records today's coffee even when last month isn't counted yet. A closed month refuses it.
- **Closing a cash month needs `counted_on`.** The member gives the amount counted and the day they counted it. The day must be after the month's last day and no later than today. The books up to the end of that day must agree with the count. A gap comes back with the difference; the UI should suggest recording what really happened, such as a loss against an Expense Category, and closing again. The stored Statement balance is the month-end balance the count proves, which is not the count itself when Transactions happened between the month end and the count. Send `counted_on` only for cash Accounts.
- **Reopen of a cash month** works even when later months have Transactions. The month must then be closed again with a new count.
- **In transit legs never block a close.** Show `transfer_legs_in_transit` on the month as information, not as a blocker.
- **Which reversals cascade:**
  - **The bank leg** of an Accept as Transfer: its row goes back to pending, and the cash leg that the Accept recorded automatically (`created_by_transfer: true`) is reversed too.
  - **A cash leg entered by hand** stays when its bank leg is reversed. It is In transit again and can be Matched again.
  - **A cash leg reversed on its own** leaves the bank leg Accepted, In transit.
  - **Either leg of a cash ↔ cash Transfer** reverses both.
  - **A closed month:** if anything the reversal would touch is in a closed month, the whole reversal is refused, and `account_id` names that Account.

  Warn before a reversal that will cascade: the UI can tell from `created_by_transfer`, and from both Accounts being cash.
- **A leg's Category can't be changed.** Hide or disable the Category picker on legs: the server answers `transfer-leg`.

## API changes since v0.8.0

### Changed

- **`AccountKind`** accepts `CASH`.
- **`addAccount`** (`AccountCreation`) gains `opening_count` and `opening_count_confirmation` (`Money`). Both are required for `CASH` and refused for any other kind (`invalid-account`). Two counts that differ get 422 `/problems/opening-count-mismatch`.
- **`createConnection`** on a cash Account: 422 `/problems/invalid-connection`.
- **`closeAccountMonth`** (`MonthClosing`) gains `counted_on` (date). It is required for cash and refused for any other kind (400 `/problems/invalid-month-closing`). A bad date gets 422 `/problems/invalid-count-date`. A gap is the existing `month-close-refused`, `BALANCE_MISMATCH`, with `computed_balance` (the books at the end of `counted_on`), `statement_balance` (the count) and `difference`.
- **`AccountMonth`** gains `counted_on` (on a closed cash month) and `transfer_legs_in_transit` (always present).
- **`AccountTransaction`** and **`Transaction`** gain:
  - `counterpart_account_id` and `match_id`, present only on legs (`match_id` only while Matched);
  - `created_by_transfer`, present only when true.

  A leg's `category_name` is "Account transfer".
- **`listAccountTransactions`** gains `in_transit=true`.
- **`acceptImportedTransaction`** (`ImportedTransactionAcceptance`) gains `transfer_account_id` and `match_transaction_id`. **Its 422 schema is now `TransferProblem`**: the existing `Problem` fields plus an optional `reason`.
- **`changeTransaction`** on a leg: 422 `/problems/transfer-leg`.
- **`reverseTransaction`**: the cascade above. **Every** `month-closed` it returns now names the Account in `account_id`.
- **`MonthProblem`** gains `account_id`.
- **Categories:** every new Household has a fourth Internal Category, "Account transfer". It can't be chosen in Accept or Set Category (`internal-category`).

### New

- **`recordCashTransaction`**: `POST /households/{household_id}/accounts/{account_id}/transactions`, with an Idempotency-Key.
- **`recountOpening`**: `POST /households/{household_id}/accounts/{account_id}/opening-count`, with an Idempotency-Key. Answers 200 with the `Account`.
- **`listTransferSuggestions`**: `GET /households/{household_id}/imported-transactions/{imported_transaction_id}/transfer-suggestions?account_id=`. Answers a `TransactionList`.
- **`getMatch`**: `GET /households/{household_id}/matches/{match_id}`. A removed Match gets 404.

### New problem types

| Problem type | Status | When |
|---|---|---|
| `/problems/opening-count-mismatch` | 422 | The two Opening counts differ. |
| `/problems/opening-count-locked` | 409 | Recount after the start month has closed. |
| `/problems/not-a-cash-account` | 422 | Recording a Transaction or recounting on a statement Account. |
| `/problems/invalid-transfer` | 422 | A refused Transfer; `reason` says why (below). |
| `/problems/transfer-leg` | 422 | Set Category on a leg. |
| `/problems/invalid-count-date` | 422 | `counted_on` not after the month's last day, or after today. |
| `/problems/invalid-month-closing` | 400 | `counted_on` missing for cash, or sent for any other kind. |

`invalid-transfer` reasons:
- `CATEGORY_AND_TRANSFER`: both a Category and a Transfer were sent.
- `MATCH_WITHOUT_TRANSFER`: `match_transaction_id` without `transfer_account_id`.
- `COUNTERPART_NOT_CASH`: Accept as Transfer, or suggestions, with a statement Account.
- `SAME_ACCOUNT`: the counterpart is the Account itself.
- `CURRENCY_MISMATCH`: the two Accounts have different currencies.
- `UNKNOWN_ACCOUNT`: the counterpart isn't one of the Household's Accounts.
- `NOT_A_MATCHING_LEG`: the leg to match isn't an In transit leg on the cash Account naming the row's Account, with the opposite amount.

## Flows, with examples

Amounts are `Money`: `{"amount": "40.00", "currency": "EUR"}`. Responses are trimmed to the new or relevant fields.

### Add a cash Account

```http
POST /api/households/{h}/accounts
{"name": "Wallet", "kind": "CASH", "currency": "EUR", "start_date": "2026-01-01",
 "opening_count": {"amount": "40.00", "currency": "EUR"},
 "opening_count_confirmation": {"amount": "40.00", "currency": "EUR"}}

201 {"account_id": "…", "kind": "CASH", "awaiting_first_statement_import": false,
     "balance": {"amount": "40.00", "currency": "EUR"}, …}
```

### Record a cash Transaction

A plain one, with a Category or none for Uncategorised:

```http
POST /api/households/{h}/accounts/{wallet}/transactions
{"date": "2026-02-05", "amount": {"amount": "-2.50", "currency": "EUR"},
 "description": "Coffee", "payee": "Café Central", "category_id": "{food}"}

201 {"transaction_id": "…", "account_id": "{wallet}", "booking_date": "2026-02-05",
     "transaction_date": "2026-02-05", "category_name": "Food", …}
```

A leg noted first. Here a withdrawal is noted at the ATM, before the bank statement arrives; it stays In transit:

```http
POST /api/households/{h}/accounts/{wallet}/transactions
{"date": "2026-01-02", "amount": {"amount": "100.00", "currency": "EUR"},
 "description": "ATM", "counterpart_account_id": "{bank}"}

201 {"transaction_id": "{leg}", "category_name": "Account transfer",
     "counterpart_account_id": "{bank}", …}        // no match_id: In transit
```

Cash ↔ cash: the answer is this Account's leg, and its Match names the other leg:

```http
POST /api/households/{h}/accounts/{wallet}/transactions
{"date": "2026-02-05", "amount": {"amount": "-15.00", "currency": "EUR"},
 "description": "To the purse", "counterpart_account_id": "{purse}"}

201 {"amount": {"amount": "-15.00", …}, "counterpart_account_id": "{purse}", "match_id": "{m}", …}
```

### Close a cash month by a count

```http
POST /api/households/{h}/accounts/{wallet}/months/2026-01/close
{"statement_balance": {"amount": "30.00", "currency": "EUR"}, "counted_on": "2026-02-03"}

422 {"type": "/problems/month-close-refused", "reasons": ["BALANCE_MISMATCH"],
     "computed_balance": {"amount": "32.50", …}, "statement_balance": {"amount": "30.00", …},
     "difference": {"amount": "-2.50", …}}
```

After the member records the €2.50 loss in January, the same close passes:

```http
200 {"booking_month": "2026-01", "state": "CLOSED", "counted_on": "2026-02-03",
     "statement_balance": {"amount": "35.00", …},     // month-end balance, not the count
     "transfer_legs_in_transit": 0, …}
```

### Accept a bank row as a Transfer, without a suggestion

```http
POST /api/households/{h}/imported-transactions/{atm-row}/accept
{"transfer_account_id": "{wallet}"}

200 {"state": "ACCEPTED", "transaction_id": "{bank-leg}", …}
```

The bank leg (`counterpart_account_id: {wallet}`) and a new cash leg (`created_by_transfer: true`, dated on the row's Transaction date) now share a `match_id`. `GET /matches/{match_id}` returns:

```json
{"match_id": "…", "kind": "ACCOUNT_TRANSFER",
 "legs": [{"transaction_id": "{bank-leg}", "account_id": "{bank}"},
          {"transaction_id": "{cash-leg}", "account_id": "{wallet}"}],
 "confirmed_by": "{user}", "confirmed_at": "2026-11-25T18:00:00Z"}
```

### Accept a bank row as a Transfer, with a suggestion

Ask which cash legs could be the row's other side:

```http
GET /api/households/{h}/imported-transactions/{atm-row}/transfer-suggestions?account_id={wallet}

200 {"items": [{"transaction_id": "{leg}", "transaction_date": "2026-01-02",
                "amount": {"amount": "100.00", …}, "counterpart_account_id": "{bank}", …}]}
```

The suggestions are In transit legs naming the row's Account, with the opposite amount, within 7 days of the row's Transaction date, closest first. When there are any, the UI should offer them before recording a new cash leg, so the same withdrawal isn't counted twice. Confirming one:

```http
POST /api/households/{h}/imported-transactions/{atm-row}/accept
{"transfer_account_id": "{wallet}", "match_transaction_id": "{leg}"}

200 {"state": "ACCEPTED", …}          // no second cash leg; {leg} now has a match_id
```

There's no date window when confirming, so a member may pick a leg that wasn't suggested. If another Accept took the leg first, the answer is 422 `NOT_A_MATCHING_LEG`.

### Reverse a leg

```http
POST /api/households/{h}/transactions/{bank-leg}/reverse

201 {"reversal_of_transaction_id": "{bank-leg}", …}
```

After this:
- the Match gets 404;
- the row is pending again;
- an automatic cash leg is reversed too, while a manual one now shows under `in_transit=true`.

If anything the reversal would touch is in a closed month:

```http
409 {"type": "/problems/month-closed", "booking_month": "2026-01", "account_id": "{wallet}", …}
```

Nothing is reversed.

## Not in this release

- Transfers between statement Accounts (bank ↔ bank, card repayments, loans).
- A standalone "Match these two legs" command: a leg left In transit by mistake is reversed and recorded again.
- Editing a Transaction.
- Split cash Transactions.
- Category totals and Budgets.

## Answer

Resolved on 2026-11-26 by [spec.md](../spec.md), which was grilled from this hand-off. The backend tagged the release as **v0.9.0**, and ticket 02 pins it.

The spec adds one rule the backend doesn't have yet: a Category's kind must fit the amount's sign. That rule is requested in `../wallet-accountant/.scratch/category-direction/`, and ticket 11 picks it up here.
