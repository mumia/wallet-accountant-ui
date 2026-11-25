# 06: Remove a member, or leave the Household

Status: ready-for-agent
Blocked by: 03
Waits on backend: no for the mocks. The real API answers `removeMember` once a release carries the backend's join-household ticket 09.

## What to build

On the Members screen:

- **Remove…** on every row except your own. An AlertDialog, then `DELETE …/members/{user_id}`.
- **Leave Household…** in the screen header. An AlertDialog, then `DELETE …/members/{your user_id}`.
  - With one member the button is disabled, with the "only member" description linked by `aria-describedby`.
  - After leaving: invalidate `GET /households`, forget the last-used Household if it's this one, then go to `/`.

## Acceptance criteria

- [ ] Remove confirms, then invalidates the members. A 404 closes the dialog, shows a toast and refetches
- [ ] Leave confirms, then lands in another Household, or on `/households/new` when it was the only one. A 409 `last-member` is the dialog's alert
- [ ] Leave is disabled, with the reason, for the only member
- [ ] Mock: `DELETE …/members/{user_id}` answers 404 for a non-member and 409 `/problems/last-member` for the only member. Otherwise it removes them, and when it's the caller, drops the Household from their `GET /households`
- [ ] E2e: remove the second member; leave to another Household; leave your only Household (but with another member left) to `/households/new`; Leave disabled when alone; the 409 race through a `mock-…` parameter. axe on both dialogs

## Spec

[spec.md](../spec.md): stories 16–18; "Revoke, Remove and Leave".
