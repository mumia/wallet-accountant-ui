# 02: Move the contract to v0.11.0

Status: claimed
Blocked by: —
Waits on backend: no. v0.11.0 is tagged (the merge of mumia/wallet-accountant#52).

## What to build

Move `src/api/openapi.yaml` to backend **v0.11.0** with `make contract-update ref=v0.11.0`, and make the UI work with it unchanged in behaviour.

- **The breaking change:** `listTransferSuggestions` answers `{ legs, imported_transactions }`. The To review Accept flow (`acceptRow`) and the suggestions dialog read `legs` instead of `items`. `imported_transactions` is ignored until ticket 05.
- **`ImportedTransaction.account_id`** is required now. Fixtures and the mock fill it.
- **The mock backend:** suggestions answer the new shape, with `imported_transactions: []`. `COUNTERPART_NOT_CASH` is gone from the contract, so the typed mock can't answer it. The UI offers no statement counterpart before ticket 04, so the mock may keep refusing one until then; ticket 04 replaces that with the real behaviour.

Ship the contract move and the `legs` read together. Don't deploy backend v0.11.0 to the local cluster before this merges.

## Acceptance criteria

- [ ] `src/api/CONTRACT_VERSION` is `v0.11.0`; `make contract-check` passes
- [ ] The cash suggestions flow reads `legs`; its e2e (`accept-transfer.spec.ts`) passes unchanged
- [ ] The mock fills `account_id` on every Imported transaction and answers the new suggestions shape
- [ ] `make check` passes

## Spec

[spec.md](../spec.md): "Contract (ticket 02)".

## Comments

- 2026-11-28: built on `build/statement-transfers-02-contract-v0.11.0`, from `chore/statement-transfers-spec` (#63, not merged yet).
  - **Contract:** `make contract-update ref=v0.11.0` copied the contract and regenerated `schema.gen.ts`. Nothing else in the repo named v0.10.1.
  - **`legs`:** `acceptRow` (`to-review-tab.tsx`) and the suggestions dialog read `legs`; the dialog's local list is called `legs` too. `imported_transactions` is ignored until ticket 05.
  - **`account_id`:** the mock stores rows per Account (`importedRows[accountId]`), so its stored `ImportedRow` leaves `account_id` out and `shown()` adds it from that key, on listing and on every decision.
  - **Mock suggestions:** the `{ legs, imported_transactions: [] }` shape. Without `account_id` it looks on every other cash Account in the row's currency, which is what the backend does today for the Accounts the mock books. Ticket 04 adds bank and card.
  - **Correction to "What to build":** the contract's `reason` is an open enum (`${string}`), so the typed mock *can* still answer `COUNTERPART_NOT_CASH`. It keeps refusing a bank or card counterpart that way, with a comment, until ticket 04 books one; the UI offers none before then. The other `invalid-transfer` details now use the backend's v0.11.0 wording, and the new reasons are in the table.
  - **Tests:** the suggestion tests read `legs` and check `imported_transactions` is empty; new: suggestions without `account_id` (two wallets, a USD one left out), and `account_id` on listed and Accepted rows.

