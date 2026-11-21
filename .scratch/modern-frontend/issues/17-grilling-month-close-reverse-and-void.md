# Grilling: Month close, Reverse and Void

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 12, 13

## Question

How do the one-month screen and the two corrective actions work in detail?

- **Month close**: how the month shows its status, Statement balance, computed balance and blockers; how every refusal reason in the problem's `reasons` is listed and linked (per [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md)); what the Close month form asks for and confirms.
- **Reverse** a Transaction and **Void** the latest Statement import: the confirmation wording, what the User sees afterwards, and when each action is unavailable (closed month, not the latest import, …).

## Comments

**2026-11-20, from [Grilling: the Statement import flow](16-grilling-the-statement-import-flow.md):** the Statement imports tab takes an optional `?statement_import_id=` that highlights one import (linked from a duplicate-file refusal). The flow's Balance-check-failed hint links to this tab, where Void lives.

**2026-11-20, from the user while grilling this ticket (⚠️ backend):** a closed month is fully closed and accepts no further entries; only one month is open at a time, and the next one (or January of the next year) opens only once the previous one is closed. This replaces the backend's "a closed month can still be edited, but any change is flagged". Added to the map's Backend changes; its detail is settled in this ticket's Answer.

**2026-11-21, from [Grilling: overview reads the backend must serve](11-grilling-overview-reads-the-backend-must-serve.md) (amendment):** `AccountMonth.state` gains `NOT_OPEN_YET`, which the month screen's Not open yet state reads. A future month holding booked rows is a real Not open yet month, not "not a month of this Account"; months after the later of the current month and the last booked row still show "not a month of this Account".

## Answer

Decided with the user on 2026-11-20, against `../wallet-accountant/api/openapi.yaml`. The user changed the Month close rules during the grilling; they replace the backend's "a closed month can still be edited, but any change is flagged".

### Month rules (backend)

- **One open month per Account.** The first open month is the start date's month. The next month (December rolls into the next January) opens only when the open month closes. Months are closed one at a time; there is no bulk close.
- **A month closes only once it has ended**: closing the month in progress is refused.
- **A closed month locks money and descriptions.** Accept, Keep, Discard and Reverse of anything booked in it are refused. Its Transactions' Category can still change, but never to Uncategorised.
- **Reopen**: only the latest closed month, and only while the open month has no Accepted Transactions. Reopening it makes the month after it not open yet again, and the month must be closed again with its Statement balance.
- **Statement import rows outside the open month**: rows in months not open yet become pending Imported transactions that can't be Accepted, Kept or Discarded until their month opens. Rows in a closed month are ignored and counted, like rows before the start date. How the Balance check accounts for those ignored rows is for the backend grilling to settle.
- **Void** is also refused when any of the import's rows fall in a closed month; the User Reopens back to that month first.
- `flagged` disappears.

### Month screen (`…/accounts/:accountId/months/:bookingMonth`)

Four states, with ← / → arrows between months; a month before the start date or in the future shows "not a month of this Account".

- **Open**:
  - Every blocker is listed up front: pending, Suspected duplicates and Uncategorised counts, and the unchecked Statement imports. Each links to where it is fixed (as in [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md)). An unchecked import links to Statement imports with `?statement_import_id=`.
  - The **Close month** form has one field, the Statement balance, typed once in the Account currency (our amount input). Under it, "Computed balance €X · Difference €Y" updates live, with the help text "Nothing is booked to make them meet: find and correct the wrong entry" and a link to the month's Transactions.
  - Close is always enabled. The form is its own confirmation: under the button, "Closing makes January 2026 read-only, except Categories, and opens February 2026."
  - A refusal replaces the blocker list with the problem's `reasons` and their details (the counts, `unchecked_statement_imports`, and the computed balance, Statement balance and difference). The input is kept.
  - Success goes to the next month's screen, with a toast.
  - While the month hasn't ended, the form is disabled: "You can close November 2026 from 1 Dec 2026."
- **Closed**: Statement balance, "Closed on …", a Closed badge, and **Reopen** on the latest closed month.
  - The Reopen dialog: "**Reopen January 2026?** February 2026 goes back to not open yet and January becomes editable again. You'll need to close January again with its Statement balance." Afterwards the User stays on January, now open.
  - When `reopen_blocked` is set, Reopen is disabled with "February 2026 has Accepted Transactions. Reverse them first", linking there.
- **Not open yet**: "Close December 2025 first", linking there, plus the month's pending count for information.
- **Awaiting the first Statement import**: the Account's getting-started state.

### Reverse (Transactions tab)

- Offered only on rows in the open month, from the row menu. It isn't offered on reversals, reversed Transactions, or the Opening balance Transaction, which is recognised by its Internal "Opening balance" Category. A 422 that slips through shows as a toast.
- **Dialog**: "**Reverse "Coffee", −€3.50 on 15 Jan 2026?** A reversal with the opposite amount is recorded on the same date; both stay in the list." When `imported_transaction_id` is set, it adds: "Its Imported transaction goes back to To review, to be Accepted again or Discarded." The buttons are Cancel and **Reverse**, styled as destructive.
- **Afterwards**: no optimistic update. The list refetches, and a toast says "Reversed. Its Imported transaction is back in To review" with an **Open** link (the second sentence only when the Transaction came from an Accept).
- **Display**: a reversed original is muted, with a "Reversed" badge linking to its reversal. A reversal shows "Reversal of …", linking to the original and highlighting it. Neither has a strikethrough or a Category picker, and the Uncategorised filter leaves both out.
- **Rows in a closed month**: the Category picker still works, but Uncategorised is left out of it. Reverse is hidden. A lock icon by the amount explains "January 2026 is closed".

### Void (Statement imports tab)

- **The list**: one list of all the Account's Connections' imports, newest first. Each row shows its Connection, Export balance, row counts and a Balance check badge. A FAILED badge carries the hint "Void it and import a corrected file." A voided import stays in the list, muted, with "Voided on …". `?statement_import_id=` highlights one import.
- **When Void is shown**: it's enabled only when `void_blocked_by` is empty. Otherwise it's disabled with the reason and a fix link: Transactions, to reverse Accepted rows, or the latest closed month, to Reopen. The 409 refusals are still shown in the dialog, in case something changed in between.
- **Dialog**: "**Void the import of 3 Feb 2026 (42 rows)?** Its Imported transactions become Discarded and the file can be imported again." For the Account's only import, it adds: "It's this Account's first import, so its Opening balance is reversed too and the Account will await its first Statement import again."
- **Afterwards**: a toast with an **Import statement** link.

### Amendments to resolved tickets

- [Grilling: the To review list](14-grilling-the-to-review-list.md): rows booked in a month not open yet show with no Accept, Keep or Discard, and a note "February 2026 isn't open yet".
- [Grilling: the Statement import flow](16-grilling-the-statement-import-flow.md): the preview's and the result's ignored-rows note also counts rows in closed months.

## Backend changes

1. **One open month per Account, sequential Month close**: the start date's month opens first, and the next opens when it closes. A month closes only once it has ended. The Ledger glossary's Month close entry changes.
2. **A closed month locks money and descriptions**: Accept, Keep, Discard and Reverse are refused with a new 409 `/problems/month-closed`. Category changes stay allowed, but moving to Uncategorised is refused with a new 422 `/problems/uncategorised-in-closed-month`. `flagged` is removed from `AccountMonth`.
3. **Reopen** the latest closed month, refused while the open month has Accepted Transactions. `AccountMonth` gets `reopen_blocked`.
4. **Statement import rows outside the open month**: rows in months not open yet land pending and can't be acted on until their month opens. Rows in closed months are ignored and counted. The Balance check must account for the ignored rows; how is left to the backend grilling.
5. **Void** refused when the import touches a closed month: a new 409 `/problems/statement-import-touches-closed-month`. `StatementImport` gets `void_blocked_by` (`NOT_LATEST`, `HAS_ACCEPTED_ROWS`, `TOUCHES_CLOSED_MONTH`; empty when allowed).
6. **`unchecked_statement_imports` on `AccountMonth`**, in the refusal's shape.
7. **`imported_transaction_id` on `AccountTransaction`**.
