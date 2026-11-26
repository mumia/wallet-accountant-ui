# 09: Accept a bank row as a Transfer

Status: needs-triage
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

- [ ] The Transfer group in the per-row picker only, cash Accounts only
- [ ] The Accept flow and the suggestions dialog as described
- [ ] Mock `listTransferSuggestions`: In transit legs naming the row's Account, with the opposite amount, within 7 days, closest first. `COUNTERPART_NOT_CASH` for a statement Account
- [ ] Mock Accept with a Transfer:
  - creates the bank leg;
  - creates the cash leg with `created_by_transfer: true`, dated on the row's Transaction date;
  - or Matches the given leg;
  - refuses with `CATEGORY_AND_TRANSFER`, `MATCH_WITHOUT_TRANSFER`, `NOT_A_MATCHING_LEG` and `CURRENCY_MISMATCH`
- [ ] E2e: no suggestion; a suggestion picked; record now despite a suggestion; the leg taken first; axe on the dialog

## Spec

[spec.md](../spec.md): stories 19–20; "Accept as Transfer (To review)".
