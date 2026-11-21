# Overview counts, the open month and month options

Status: open
Blocked by: 07, 10, 13
Waits on backend: yes. Needs `pending`, `suspected_duplicates` and `open_month` on Account, and the months list.

## What to build

Finish the parts earlier tickets left behind a seam:

- The To review count in the sidebar and overview, and "Open month: …" linking to that month.
- The Transactions tab opening on the open month, with its month field offering every month.
- The To review month field offering only months with rows To review.

## Acceptance criteria

- [ ] No seam from tickets 10 or 13 remains. The e2e tests from those tickets are updated.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 11; Screens and routes (Accounts overview); Transactions and To review (month fields).
