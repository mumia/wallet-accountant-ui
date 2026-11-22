# Rename an Account

Status: open
Blocked by: 08
Waits on backend: yes. Needs Account rename (`name`, 1–200 characters).

## What to build

"Rename…" in a small menu on the Account header beside "Import statement", opening a one-field dialog.

## Acceptance criteria

- [ ] E2e covers a rename and a length error. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 17a; Categories, Add Account and the Transaction list (Rename Account).

## Notes

- From ticket 15: The contract is pinned to v0.2.0 since ticket 15, with `changeAccount`. The backend at v0.2.0 answers 501 for it; its later commits still do.
