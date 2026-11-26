# Spec: Cash Accounts and Transfers (UI)

Status: ready (2026-11-26): grilled and agreed. No ticket has started.

This is the UI half of the backend's cash-accounts-and-transfers work. The backend sources are:

- its spec, `../wallet-accountant/.scratch/cash-accounts-and-transfers/spec.md`;
- ADR-0026, "Transfers as two Matched legs";
- the hand-off, [ticket 01](issues/01-backend-hand-off.md), which lists every API change since v0.8.0.

The backend released all of it in **v0.9.0**. The UI pins v0.7.0, and v0.8.0 didn't change the contract.

Domain terms come from `../wallet-accountant/internal/ledger/CONTEXT.md`:

- **Cash Account** and **statement Account**;
- **Opening count** (avoid "initial cash");
- **Cash count** (avoid "cash balance");
- **Transfer**, **Transfer leg** and **Counterpart Account**;
- **In transit** (never "pending", which belongs to Imported transactions);
- **Account transfer**, **Match**, **Accept**, **Reversal** and **Open month**.

This spec also adds one rule the backend doesn't have yet: **a Category's kind must fit the sign of the amount**. A backend change is requested in `../wallet-accountant/.scratch/category-direction/`.

## Problem Statement

A Household can't track its cash at all in the UI.

- **Cash:** Add Account offers no Cash kind, and nowhere can a member type a Transaction by hand.
- **ATM withdrawals:** they can only be Accepted against a spending Category. Once cash purchases are recorded too, every euro spent in cash would count twice.
- **Pickers:** they offer Expense Categories for money coming in, and Income Categories for money going out. That's almost always a mistake.

## Solution

**Cash Accounts**

- **Adding:** Add Account gains a **Cash** kind, with the Opening count typed twice. A cash Account has a balance at once.
- **Its screens:** it shows only Transactions and Months.
- **Recording:** a **Record a Transaction** sheet lets members enter cash spending, income and Transfers.
- **Closing a cash month:** the member gives a **Cash count** and the day they counted. When the count disagrees with the books, the UI offers to record the difference.
- **Correcting the Opening count:** possible while the start month is still open.

**Transfers**

- **Accept as Transfer:** in To review, a bank row such as an ATM withdrawal can be Accepted as a Transfer to a cash Account. When the member already noted the cash side, the UI offers to match it, so the withdrawal isn't counted twice.
- **Legs in Transactions:** a leg reads "Transfer to Wallet" or "Transfer from Bank", is marked **In transit** until it's Matched, and can be filtered by that.
- **Reversing a leg:** the reverse dialog warns when the reversal will cascade to the other leg.

**The sign rule**

Every Category picker, on every kind of Account, offers:

- Expense Categories only for money out;
- Income Categories only for money in;
- Transfers and Uncategorised both ways.

## User Stories

### Cash Accounts

1. As a member, I want to add a cash Account by naming it and counting the cash in it, so that the Household's cash is in the books from today.
2. As a member, I want to type the Opening count twice, and be told when the two differ, so that a slip of the finger doesn't become the starting balance.
3. As a member, I want a new cash Account to show its balance and its Transactions at once, so that I'm not asked to set up a Connection or import a statement it will never have.
4. As a member, I want a cash Account to show only Transactions and Months, so that I don't see tabs that can never have anything in them.
5. As a member who miscounted, I want to correct the Opening count while the start month is still open, so that one mistake doesn't follow the Account forever.

### Recording cash

6. As a member, I want a **Record a Transaction** sheet on a cash Account, so that I can enter what I spent or received in cash.
7. As a member, I want to type the amount with a minus for money out, so that a Transaction's sign is explicit.
8. As a member, I want to record today's coffee even when last month isn't counted yet, so that I can enter receipts as they happen.
9. As a member with a pile of receipts, I want **Save and add another** to keep the sheet open with the date kept, so that I can enter them one after another.
10. As a member, I want to pick a Category or a Transfer as the other side in one picker, so that a Transfer is just another choice.
11. As a member noting an ATM withdrawal at the machine, I want to record it as a Transfer from Bank, and be told it stays In transit until Bank's statement row is Accepted as this Transfer, so that I know it isn't finished yet.
12. As a member moving cash between two cash Accounts, I want both sides recorded at once, so that I enter it only once.

### The sign rule

13. As a member, I want every Category picker to offer only Expense Categories for money out and only Income Categories for money in, so that I can't file my salary as groceries.
14. As a member bulk-accepting a selection that mixes money out and money in, I want to be told to select only one direction before picking a Category, so that the rule holds for every row.

### Closing a cash month

15. As a member, I want to close a cash month by giving the Cash count and the day I counted it, so that the count is what proves the month.
16. As a member whose count disagrees with the books, I want to see the books, the count and the difference, and a **Record the difference…** button, so that I record what really happened (for example a loss) and close again.
17. As a member looking at a closed cash month, I want to see the day it was counted and the month-end balance the count proved, so that I know what the close stands on.
18. As a member, I want to see how many Transfer legs are In transit in a month, as information that never blocks the close, so that I know what still waits for its other side.

### Transfers

19. As a member reviewing a bank row for an ATM withdrawal, I want to Accept it as a Transfer to Wallet, so that the cash doesn't count as spending.
20. As a member who already noted that withdrawal in Wallet, I want the UI to offer my noted leg when I Accept, so that the same money isn't counted twice.
21. As a member, I want a Transfer leg in Transactions to read "Transfer to Wallet" or "Transfer from Bank", linked to that Account, so that I can follow the money.
22. As a member, I want to see which legs are In transit, and filter by them, so that I can find what still needs its other side.
23. As a member, I want a leg's Category to be fixed, so that I don't try a change the backend refuses.

### Reversing

24. As a member reversing a Transfer leg, I want to be warned when the other leg will be reversed too, or will be left In transit, so that I'm not surprised.
25. As a member whose reversal is refused because a month is closed, I want to be told which Account's month it is, so that I know where to reopen.

## Implementation Decisions

### Contract

- **Ticket 02** moves the contract to **v0.9.0** with `make contract-update ref=v0.9.0`.
- **Only additive changes, plus one schema change:** Accept's 422 answer is now `TransferProblem`, which is a `Problem` plus an optional `reason`. The usual error path, which shows the problem's `title` and `detail`, covers it.
- **The Account kind labels** learn `CASH` ("Cash"), so the contract test still passes.
- **The mock seeds the fourth Internal Category**, "Account transfer".
- **Mocks:** each later ticket extends the mock backend (MSW) for the operations it uses. As before, its handlers are typed by openapi-msw.

### The sign rule (every Account kind)

**Which groups fit which sign**

- **Money out (a negative amount):** Expense Categories.
- **Money in (a positive amount):** Income Categories.
- **Both ways:** Uncategorised (where it's already offered) and the Transfer group.
- **Refunds:** a refund is money in, so it goes to an Income Category, such as one the Household calls "Refunds". There is no special case for it.

**Where it applies**

- **Transactions → Set Category:** the picker is filtered by the row's sign.
- **To review → the per-row picker:** it's filtered by the row's sign.
- **To review → the bulk "Accept as" picker:**
  - when the selection is all money out, or all money in, it's filtered to fit;
  - when it mixes both, it offers only Uncategorised, with the hint "Select only money out, or only money in, to pick a Category".
- **Record a Transaction:**
  - while no amount is typed, every group shows;
  - when the sign changes and the chosen Category no longer fits, it's cleared with a short field message.
- **Rows that already break the rule** keep their Category as shown. The picker just won't offer it again. All current data is disposable, so nothing is migrated.

**How it's built**

The CategoryPicker takes the amount's sign as an input. It does no filtering when given none.

**The backend's part**

The backend will also refuse a Category whose kind doesn't fit, which is the request in `../wallet-accountant/.scratch/category-direction/`. The UI doesn't wait for it: filtering is correct whether or not the server checks. Ticket 11 picks up the backend release.

### Cash Account screens

**Add Account**

- **The Cash kind:** a fifth kind card, **Cash**.
- **The Opening count fields:** choosing Cash reveals **Opening count** and **Opening count again** (AmountInputs in the chosen currency, both required).
  - The form refuses two different counts with a field error on the second one, "The two counts differ. Count again."
  - The server's 422 `opening-count-mismatch` is a backstop, shown as the form alert.
- **Start date:** for Cash it defaults to **today**. Switching the kind restores the 1st of the month, unless the member has edited the date.

**The Account area**

- **Tabs:** a cash Account shows only **Transactions** and **Months**. There's no To review, Statement imports or Connections tab, and no Import statement button.
- **The index page** goes straight to Transactions. A cash Account is never `awaiting_first_statement_import`.
- **The header** has a **Record a Transaction** button where a statement Account has Import statement.
- **The ⋯ menu** has Rename… and, while `open_month` is the start date's month, **Correct opening count…**.
- **Routes:** a statement-only route opened for a cash Account (to-review, statement-imports, connections) redirects to Transactions. In the other direction, nothing on a statement Account links to recording.

**The Accounts overview**

- **To review** shows "—" for a cash Account.
- **Balance and Month** show as they do for a statement Account.

**Correct opening count…**

- **The dialog:** two AmountInputs with the same in-form check as Add Account, then `POST …/accounts/{id}/opening-count` with an Idempotency-Key.
- **On 200:** the Account's queries and its Transactions are invalidated, so the balance refreshes.
- **409 `opening-count-locked`:** shown as the form alert, which only happens in a race.

### Record a Transaction

**The sheet**

- **Where it lives:** a side sheet, full-screen on mobile, opened from the cash Account header and from the Transactions tab's empty state ("No Transactions yet — Record one"). Rows saved while it's open appear in the table behind it.

**The fields, in order**

1. **Amount:** a signed AmountInput in the Account's currency, required and not zero. A minus means money out. The description says so: "Use a minus for money out, e.g. -2.50".
2. **Other side:** one picker, which may be left empty for Uncategorised. Its groups, filtered by the amount's sign:
   - **Expense** (money out) and **Income** (money in);
   - **Transfer**, both ways: every other Household Account in the same currency, cash or statement. A Transfer entry reads "Transfer to Bank" for money out and "Transfer from Bank" for money in, or simply "Transfer · Bank" while no amount is typed.
   - Picking a statement Account shows a note under the picker: "This stays In transit until Bank's statement row is Accepted as this Transfer."
3. **Date:** a DateInput defaulting to today.
   - **Latest:** today, in UTC as the backend reckons it.
   - **Earliest:** the later of the open month's 1st and the Account's start date. **DateInput gains a `min` prop.**
   - **Later months:** allowed silently.
4. **Description:** required, 1–500 characters, trimmed.
5. **Payee:** optional, at most 200 characters.

**What it sends**

- **The request:** `POST …/accounts/{id}/transactions` with `{date, amount, description, payee?, category_id? | counterpart_account_id?}`.
- **Idempotency:** one Idempotency-Key per form, renewed after each successful save, so a double click or a retry never records twice.

**The buttons**

- **Save and add another**, the default button on Enter: keeps the sheet open, keeps the date, clears the other fields and focuses Amount.
- **Save:** closes the sheet.

**After each save**

- **Toast:** a confirmation, with no Open link, because the row is visible.
- **Refetches:** the Account's Transactions, balance and months are invalidated. For a cash ↔ cash Transfer, the Counterpart Account's are too.

**Problems**

The server's problem shows as the form alert, with the input kept. This covers, for example, a closed month, or `invalid-transfer` with its `reason`.

**Prefilling**

The sheet can be opened prefilled by another screen. **Record the difference…** passes amount, date and description.

### Closing a cash month

**The open cash month's close form**

- **Cash count:** an AmountInput.
- **Counted on:** a DateInput, defaulting to today, with `min` the day after the month's last day and `max` today. The form is still disabled until the month has ended.
- **No live difference:** the computed balance and difference the statement form shows are **hidden for cash**. The server compares the books at the end of Counted on, which can differ from the month-end balance the page knows.
- **The request:** `{statement_balance: <count>, counted_on}`.

**A `BALANCE_MISMATCH` refusal**

The existing refusal alert shows the server's `computed_balance` (labelled "Books on {counted_on}"), the count and the `difference`. It adds a **Record the difference…** button, which opens the Record a Transaction sheet prefilled with:

- the difference as a signed amount;
- the month's last day as the date;
- "Cash count difference" as the description;
- no Category: the member picks one, and the sign rule offers Expense for a loss and Income for a gain.

After saving, the member closes again.

**Other problems**

- 422 `invalid-count-date` is shown as the form alert.
- `invalid-month-closing` can't happen, because the form always sends `counted_on` for cash and never for statement Accounts.

**A closed cash month**

- **What it shows:** **Counted on**, plus the Statement balance labelled "Balance at month end (proven by the count)". The count itself isn't stored.
- **Reopen:** works as for any month, even when later months have Transactions. The confirmation adds "You'll need to count again to close it."

**Every month, any kind**

- **The In transit count:** when `transfer_legs_in_transit` > 0, the month shows "{n} Transfer legs In transit" as information, not among the blockers. It links to Transactions filtered to In transit.

### Transfer legs in Transactions

**How a leg looks**

- **What makes a row a leg:** it has `counterpart_account_id`.
- **Category cell:** fixed text, never a picker. It reads "Transfer to {Counterpart}" when the amount is negative and "Transfer from {Counterpart}" when it's positive. The Counterpart's name links to that Account's Transactions.
- **In transit:** a leg with no `match_id` shows an **In transit** badge.

**Filtering**

An **In transit only** chip beside "Uncategorised only" uses `listAccountTransactions?in_transit=true`. It's disabled for "all months", as Uncategorised only is.

**No Match view**

The UI doesn't call `getMatch` in v1.

### Accept as Transfer (To review)

**The per-row picker**

It gains a **Transfer** group listing the Household's **cash** Accounts in the row's currency, such as "Transfer to Wallet" or "Transfer from Wallet" by the row's sign. Statement Accounts aren't offered, because the backend refuses them (`COUNTERPART_NOT_CASH`).

**Accepting a row with a Transfer chosen**

1. The UI calls `GET …/imported-transactions/{id}/transfer-suggestions?account_id={cash}`.
2. **No suggestions:** it Accepts at once with `{transfer_account_id}`, which also records the cash leg.
3. **Some suggestions:** a dialog asks "Did you already note this in Wallet?" It lists each suggestion (date, description, amount, closest first) as a radio, plus **"No, record it in Wallet now"**.
   - Confirming a suggestion Accepts with `{transfer_account_id, match_transaction_id}`.
   - Confirming the last choice Accepts with `{transfer_account_id}` alone.
4. **A 422 `NOT_A_MATCHING_LEG`:** another Accept took that leg first. The dialog shows the problem as its alert and refetches the suggestions.

**The bulk "Accept as" picker** has no Transfer group.

**Not in v1:** picking a leg that wasn't suggested. The backend allows it, but a leg noted more than 7 days away can be reversed and recorded again.

**After Accept**

The usual "Accepted" toast. The cash Account's Transactions, balance and months are invalidated too.

### Reversing legs

**The reverse dialog's warning**, by the leg being reversed:

| Leg | Warning |
|---|---|
| A bank leg (statement Account, `counterpart_account_id`, `match_id`) | "Its row goes back to To review. If Wallet's side was recorded by this Accept, it's reversed too. If you noted it by hand, it stays, In transit." |
| A cash leg with `created_by_transfer` | "Only this side is reversed. Bank's side stays Accepted, In transit." |
| A cash leg entered by hand, with a statement Counterpart | the same as the row above |
| Either leg of a cash ↔ cash Transfer (both Accounts cash) | "Both sides are reversed: this one and Purse's." |
| An In transit leg (no `match_id`) | no extra warning |

**After a reversal**

The Counterpart Account's Transactions, balance, months and To review are invalidated too.

**409 `month-closed`**

The toast names the Account from `account_id`, looked up in the Accounts list, and the month: "Wallet's January 2026 is closed. Reopen it to reverse this." This applies to every `month-closed`, not just legs.

### Strings and accessibility

- **Strings:** every string goes in the English message files.
- **Recording:** the sheet has a title, a description and a visible close.
- **Accept as Transfer:** the suggestions dialog's choices are a real radio group.
- **In transit badges** have text, not just a colour.
- **axe** runs on every new screen and state.

## Testing Decisions

**Same bar as the earlier slices**

Drive the UI by role, label and keyboard. Assert on what the member sees and what goes over the network. Never mock the API client.

**Unit tests**

- **Category filtering by sign:** the picker's groups for money out, money in, no amount and a mixed bulk selection.
- **The cash date range:** the min and max dates for the recording sheet, including a start date inside the open month.
- **The Counted on range** for the close form.
- **Legs:** the leg label (to or from, by sign) and the reverse warning chosen for each kind of leg.

**E2e (Playwright with MSW and axe)**

- **Add a cash Account:**
  - the counts differ, then agree;
  - the member lands on Transactions with the balance;
  - only two tabs show.
- **Record:**
  - spending, income and Uncategorised;
  - Save and add another;
  - a Category cleared by a sign flip;
  - a date before the open month refused;
  - a Transfer to a statement Account shows In transit;
  - cash ↔ cash shows on both Accounts.
- **Close a cash month:**
  - a refusal, then Record the difference…, then the close passes;
  - the closed month shows Counted on;
  - reopen.
- **Correct opening count:** allowed in the start month; the item is gone once that month closes.
- **Accept as Transfer:**
  - with no suggestion;
  - with a suggestion picked;
  - with "record it now" chosen despite a suggestion;
  - with the leg taken first (`NOT_A_MATCHING_LEG`).
- **The sign rule:**
  - in To review, single and bulk (mixed selection);
  - in Set Category.
- **Reverse:**
  - each warning;
  - a refusal naming another Account's closed month.

**Real-stack smoke test (ticket 12)**

The whole flow against backend v0.9.0.

## Out of Scope

- **Transfers between statement Accounts**, such as card repayments or loans. The backend doesn't have them.
- **A Match view**, or `getMatch`.
- **Matching a leg that wasn't suggested**, and a standalone "Match these two legs" action.
- **Transfers in bulk Accept.**
- **Editing a Transaction, and split cash Transactions.**
- **Category totals and Budgets.**
- **Migrating rows that already break the sign rule.** All data is disposable at this stage.

## Tickets

| # | Ticket | Blocked by | Backend |
|---|---|---|---|
| 01 | [Backend hand-off](issues/01-backend-hand-off.md) | | resolved by this spec |
| 02 | [Move the contract to v0.9.0](issues/02-move-the-contract-to-v0.9.0.md) | | v0.9.0 released |
| 03 | [Categories follow the amount's sign](issues/03-categories-follow-the-sign.md) | 02 | UI only now; ticket 11 picks up enforcement |
| 04 | [Add a cash Account, and its Account area](issues/04-add-a-cash-account.md) | 02 | ready |
| 05 | [Record a cash Transaction](issues/05-record-a-cash-transaction.md) | 03, 04 | ready |
| 06 | [Close and reopen a cash month by a count](issues/06-close-a-cash-month.md) | 05 | ready |
| 07 | [Correct the opening count](issues/07-correct-the-opening-count.md) | 04 | ready |
| 08 | [Transfer legs: record them, and show them in Transactions](issues/08-transfer-legs.md) | 05 | ready |
| 09 | [Accept a bank row as a Transfer](issues/09-accept-as-transfer.md) | 03, 08 | ready |
| 10 | [Reverse Transfer legs](issues/10-reverse-transfer-legs.md) | 09 | ready |
| 11 | [Pick up the backend's Category direction rule](issues/11-backend-category-direction.md) | 03 | waits for a backend release with `category-direction` |
| 12 | [Real-stack smoke test: cash and an ATM Transfer](issues/12-smoke-test-cash-and-transfers.md) | 06, 07, 10 | v0.9.0 |

**Parallel work:**

- After 02, tickets 03 and 04 can run in parallel.
- After 05, tickets 06 and 08 can run in parallel.
- 07 can run any time after 04.

Tickets that touch `src/mocks/` in parallel should expect merge conflicts there.

## Further Notes

**Decided in the grilling (2026-11-25/26)**

- One spec covers both halves. The cash tickets land before the Transfer tickets.
- Actions that don't apply to a kind are hidden, not disabled.
- Recording is a sheet with a signed amount. The Category kind follows the sign everywhere.
- The cash close hides the live difference.
- The bank-leg reverse warning uses one wording for both cases, instead of calling `getMatch` or asking the backend for the other leg's flag.
- The sign rule becomes a backend invariant. Refunds go to Income.

**Ticket 01** is resolved by this spec.
