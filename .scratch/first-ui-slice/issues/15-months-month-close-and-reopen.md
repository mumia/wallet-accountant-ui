# Months, Month close and Reopen

Status: open
Blocked by: 08, 10, 13
Waits on backend: yes. Needs one open month per Account, Reopen with `reopen_blocked`, `unchecked_statement_imports`, the months list, and `NOT_OPEN_YET`.

## What to build

- The Months tab, newest first.
- The month screen with arrows and four states: Open (blockers up front, the Statement balance with a live difference, Close), Closed (Reopen when it's the latest; disabled with the reason when `reopen_blocked`), Not open yet, and Awaiting the first Statement import.
- In To review, rows in months not open yet are locked, with the reason.

## Acceptance criteria

- [ ] E2e covers closing a month, a refused close showing its `reasons`, Reopen allowed and blocked, and each month state. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 34, 39–42; Months, Month close, Reverse and Void.
