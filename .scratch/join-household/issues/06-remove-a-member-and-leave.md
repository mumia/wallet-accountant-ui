# 06: Remove a member, or leave the Household

Status: done
Blocked by: 03
Waits on backend: no for the mocks. The real API answers `removeMember` once a release carries the backend's join-household ticket 09.

## What to build

On the Members screen:

- **Remove…** on every row except your own. An AlertDialog, then `DELETE …/members/{user_id}`.
- **Leave Household…** in the screen header. An AlertDialog, then `DELETE …/members/{your user_id}`.
  - With one member the button is disabled, with the "only member" description linked by `aria-describedby`.
  - After leaving: invalidate `GET /households`, forget the last-used Household if it's this one, then go to `/`.

## Acceptance criteria

- [x] Remove confirms, then invalidates the members. A 404 closes the dialog, shows a toast and refetches
- [x] Leave confirms, then lands in another Household, or on `/households/new` when it was the only one. A 409 `last-member` is the dialog's alert
- [x] Leave is disabled, with the reason, for the only member
- [x] Mock: `DELETE …/members/{user_id}` answers 404 for a non-member and 409 `/problems/last-member` for the only member. Otherwise it removes them, and when it's the caller, drops the Household from their `GET /households`
- [x] E2e: remove the second member; leave to another Household; leave your only Household (but with another member left) to `/households/new`; Leave disabled when alone; the 409 race through a `mock-…` parameter. axe on both dialogs

## Spec

[spec.md](../spec.md): stories 16–18; "Revoke, Remove and Leave".

## Comments

Landed on 2026-11-25. Where it goes beyond or differs from the ticket:

- **AlertDialog:** the repo had no AlertDialog part yet, so `src/components/ui/alert-dialog.tsx` was added with `make ui-add c="alert-dialog"`, unchanged. Ticket 04 (Revoke) needs the same part.
- **Naming a member with no display name:** the Remove button's accessible name, the dialog title and the toast say "the member who joined {date}" ("Remove the member who joined Mar 11, 2026?"), so two nameless members stay distinguishable. The visible button text is "Remove…" on every row.
- **The race mock:** one parameter, `?mock-others-leave`, has the other members of the Household leave just before the next `DELETE …/members/…`. It reaches both refusals: Remove gets 404, Leave gets 409 `last-member`.
- **After a refused Leave:** closing the dialog refetches the members, so after the 409 race the list shows you alone and Leave is disabled with its reason.
- **Any other refusal** (a Leave that gets 404, a 5xx after the retries) is the dialog's alert, as the spec says for refusals in general.
- **Before `GET /me` answers:** Leave is disabled, since leaving needs your own User ID, and no row has Remove…, since your own row isn't known yet.
