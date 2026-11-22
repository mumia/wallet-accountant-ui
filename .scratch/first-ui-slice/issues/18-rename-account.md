# Rename an Account

Status: done
Blocked by: 08
Waits on backend: yes. Needs Account rename (`name`, 1–200 characters).

## What to build

"Rename…" in a small menu on the Account header beside "Import statement", opening a one-field dialog.

## Acceptance criteria

- [x] E2e covers a rename and a length error. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 17a; Categories, Add Account and the Transaction list (Rename Account).

## Notes

- From ticket 15: The contract is pinned to v0.2.0 since ticket 15, with `changeAccount`. The backend at v0.2.0 answers 501 for it; its later commits still do.

## Answer

Landed on 2026-11-22.

- **The menu**: the Account header has an outline "More Account actions" (⋯) button beside "Import statement", with one item, "Rename…" (`account-area.tsx`).
- **The dialog** (`features/accounts/rename-account-dialog.tsx`): "Rename Account", with "Only the name can change; the kind, Account currency and start date stay as they are." The **Name** field starts with the current name, is trimmed, and must be 1 to 200 characters. It reuses Add Account's error messages ("Give the Account a name", "A name has at most 200 characters"). Any refusal is the form alert and the dialog stays open. On success it refetches the Account and the Accounts list, so the header and sidebar follow. There is no toast, as with Category rename.
- **The mock**: `PATCH …/accounts/{account_id}` returns 400 for an empty or over-200 name, 422 `/problems/invalid-account` for a blank one, and otherwise the trimmed rename.
- **Tests**: `e2e/rename-account.spec.ts` covers a rename (header and sidebar), the length and blank errors with 200 characters accepted, and a refusal after the retries (`mock-fail=PATCH:3`). axe runs on every state.
- **Backend**: `changeAccount` is still the 501 stub on wallet-accountant main (c7078f8, `internal/ledger/adapters/http/pending.go`). Against the real API, Rename shows that problem in the form alert until the backend implements it.
- **`make check`** passes: lint, typecheck, 380 unit tests, build, audit, contract check, 73 e2e tests and the image.
