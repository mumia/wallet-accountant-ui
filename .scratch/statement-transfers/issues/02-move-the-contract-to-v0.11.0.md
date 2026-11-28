# 02: Move the contract to v0.11.0

Status: ready-for-agent
Blocked by: —
Waits on backend: yes. v0.11.0 is tagged on the merge of mumia/wallet-accountant#52.

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
