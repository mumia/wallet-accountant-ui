# 02: Your display name in the User menu

Status: ready-for-agent
Blocked by: —
Waits on backend: no for the mocks (the contract is already v0.7.0). The real API answers `PATCH /me` once a release carries the backend's join-household ticket 03.

## What to build

The User menu reads `GET /me` and shows the caller's display name. A new menu item opens a one-field dialog that changes it with `PATCH /me`. Users from before v0.4.0 have no name, so for them the item reads **Set your name…** and the menu's trigger shows a small dot.

This ticket also adds the app-wide `GET /me` query (a `useMe`-style hook) that tickets 03, 06 and 08 use to recognise "you".

## Acceptance criteria

- [ ] The User menu shows `display_name`, falling back to the token's name while `GET /me` loads or when there's no name. The email line stays
- [ ] **Your name…**, or **Set your name…** with a dot on the trigger when there's no name, opens the **Your name** dialog: one **Display name** field, prefilled, using `/register`'s Zod rules and messages, pulled into one shared schema
- [ ] On 200 the `GET /me` cache updates and every `…/members` query is invalidated. A 422 `invalid-user` is the form alert and the dialog stays open
- [ ] Mock: `GET /me` returns the mock User's `display_name`, and a `mock-…` parameter seeds a User without one. `PATCH /me` returns 400 for an empty or over-64 name, 422 `/problems/invalid-user` for a blank one, and otherwise the trimmed name
- [ ] E2e: setting a name for a nameless User (the dot goes away), changing a name, the blank-name 422 and the length error. axe on each state

## Spec

[spec.md](../spec.md): stories 12–14; "Display name".
