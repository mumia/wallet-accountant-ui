# 09: Accept a bank row as a Transfer

Status: in-review
Blocked by: 03, 08
Waits on backend: no

## What to build

**The per-row picker** in To review gains a **Transfer** group listing the Household's **cash** Accounts in the row's currency, labelled to or from by the row's sign. Bulk "Accept as" has no Transfer group.

**Accepting a row with a Transfer chosen**

1. Fetch `transfer-suggestions?account_id=`.
2. **None:** Accept with `{transfer_account_id}`.
3. **Some:** a dialog, "Did you already note this in {Account}?":
   - the suggestions as a radio group (date, description, amount, closest first), plus "No, record it in {Account} now";
   - confirming Accepts with `{transfer_account_id, match_transaction_id}`, or with `{transfer_account_id}` alone.
4. **422 `NOT_A_MATCHING_LEG`:** the dialog's alert, and the suggestions refetched.

**After Accept:** the usual toast, plus the cash Account's Transactions, balance and months invalidated.

## Acceptance criteria

- [x] The Transfer group in the per-row picker only, cash Accounts only
- [x] The Accept flow and the suggestions dialog as described
- [x] Mock `listTransferSuggestions`: In transit legs naming the row's Account, with the opposite amount, within 7 days, closest first. `COUNTERPART_NOT_CASH` for a statement Account
- [x] Mock Accept with a Transfer:
  - creates the bank leg;
  - creates the cash leg with `created_by_transfer: true`, dated on the row's Transaction date;
  - or Matches the given leg;
  - refuses with `CATEGORY_AND_TRANSFER`, `MATCH_WITHOUT_TRANSFER`, `NOT_A_MATCHING_LEG` and `CURRENCY_MISMATCH`
- [x] E2e: no suggestion; a suggestion picked; record now despite a suggestion; the leg taken first; axe on the dialog

## Spec

[spec.md](../spec.md): stories 19–20; "Accept as Transfer (To review)".

## Comments

- 2026-11-27: built on `build/cash-accounts-09-accept-as-transfer`, from main (08 is merged).
  - **The per-row picker** gets `transfersOf`: the Household's cash Accounts in the row's currency, read "Transfer to Wallet" or "Transfer from Wallet" by the row's sign. The list is kept per currency in a memo. A new array each render made Base UI rebuild the options, and a click could miss them. Bulk "Accept as" passes no `transfers`.
  - **Accept** (`acceptRow` in the tab): with a Transfer picked, it fetches `transfer-suggestions` (`staleTime: 0`). With none it Accepts at once through the usual `useDecide`, which turns a Transfer value into `{transfer_account_id}` (`acceptance`). With some it opens `TransferSuggestionsDialog`.
  - **The dialog** shows "Did you already note this in Wallet?" and a real radio group named by the title. Each suggestion shows its description, date and amount, closest first and picked by default, with "No, record it in Wallet now" last. Confirming calls `useAcceptTransfer`. Any refusal is the dialog's alert. `NOT_A_MATCHING_LEG` also refetches the suggestions, and the choice falls back to the closest one left, or to record now.
  - **After Accept:** the usual "1 Accepted" toast. Every Accept that names a cash Account also invalidates that Account's Transactions, and `refetchAccountReads` refreshes its balance and months.
  - **The mock** follows the backend: `CATEGORY_AND_TRANSFER` and `MATCH_WITHOUT_TRANSFER` before the row is read; then `SAME_ACCOUNT`, `UNKNOWN_ACCOUNT`, `COUNTERPART_NOT_CASH` and `CURRENCY_MISMATCH`; then `NOT_A_MATCHING_LEG` for a given leg (no date window), or a closed month of the cash Account (409 naming it) for a new cash leg. The bank leg is booked against Account transfer. The cash leg is booked on the row's Transaction date with `created_by_transfer`, and both share one `match_id`. The suggestions list uses the backend's filter and order.
  - **Not here:** reversing legs (ticket 10). The cash-month-closed 409 is in the mock but not tested: a cash Account's start month is always open for November's rows.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check;
  - unit tests: 583 passed (new: `src/mocks/imported-transaction-handlers.test.ts`);
  - e2e: 143 passed (new: `e2e/accept-transfer.spec.ts`);
  - the image test.
