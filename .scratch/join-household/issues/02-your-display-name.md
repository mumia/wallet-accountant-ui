# 02: Your display name in the User menu

Status: done
Blocked by: —
Waits on backend: no for the mocks (the contract is already v0.7.0). The real API answers `PATCH /me` once a release carries the backend's join-household ticket 03.

## What to build

The User menu reads `GET /me` and shows the caller's display name. A new menu item opens a one-field dialog that changes it with `PATCH /me`. Users from before v0.4.0 have no name, so for them the item reads **Set your name…** and the menu's trigger shows a small dot.

This ticket also adds the app-wide `GET /me` query (a `useMe`-style hook) that tickets 03, 06 and 08 use to recognise "you".

## Acceptance criteria

- [x] The User menu shows `display_name`, falling back to the token's name while `GET /me` loads or when there's no name. The email line stays
- [x] **Your name…**, or **Set your name…** with a dot on the trigger when there's no name, opens the **Your name** dialog: one **Display name** field, prefilled, using `/register`'s Zod rules and messages, pulled into one shared schema
- [x] On 200 the `GET /me` cache updates and every `…/members` query is invalidated. A 422 `invalid-user` is the form alert and the dialog stays open
- [x] Mock: `GET /me` returns the mock User's `display_name`, and a `mock-…` parameter seeds a User without one. `PATCH /me` returns 400 for an empty or over-64 name, 422 `/problems/invalid-user` for a blank one, and otherwise the trimmed name
- [x] E2e: setting a name for a nameless User (the dot goes away), changing a name, the blank-name 422 and the length error. axe on each state

## Spec

[spec.md](../spec.md): stories 12–14; "Display name".

## Answer

Landed on 2026-11-25.

- **`GET /me` everywhere:** `components/me.ts` has `useMe()`, the app-wide `GET /me` query that tickets 03, 06 and 08 use to recognise "you". It also has `meChanged()`, which puts a `PATCH /me` answer into every `GET /me` cache entry and invalidates every `…/members` query.
- **The User menu** (`features/shell/user-menu.tsx`) shows `display_name`, falling back to the token's name while `GET /me` loads, when it fails, or when there's no name.
  - It shows the dot (with the screen-reader text "Your name isn't set") and **Set your name…** only once `GET /me` has answered without a name, so it never flashes while loading.
  - With a name, the item reads **Your name…**.
- **The dialog** (`features/shell/your-name-dialog.tsx`) is modelled on Rename Account. It has one **Display name** field, prefilled. Any refusal is the form alert and the dialog stays open.
- **One shared schema:** `lib/display-name.ts` has `displayNameSchema` (trimmed, 1–64 characters), which `/register` now uses too. The field's label and messages moved from `firstRun.register.*` to `common.displayName.*`.
- **The mock:**
  - the seeded User is now named "Sam" (the token says "Sam Example"), in the `household` and `registered` scenarios;
  - a new `?mock-scenario=unnamed` is `household` with no display name;
  - `PATCH /me` answers 400 for an empty or over-64 name, 403 for an unregistered caller, 422 `/problems/invalid-user` for a blank one (the same problem object `POST /registrations` uses), and otherwise 200 with the trimmed name.
- **Tests:**
  - unit tests for the schema (`lib/display-name.test.ts`);
  - `e2e/your-name.spec.ts`: setting a name as an `unnamed` User (the dot and "Set your name…" go away), changing a name and keeping it after a reload, the 65-character and blank errors with 64 accepted, and a refusal through `mock-fail=PATCH:3` that is then retried;
  - axe runs on each state;
  - `shell.spec.ts` and `appearance.spec.ts` now find the User menu by `/^Sam/`.
- **The backend's 422 for a blank name can't be reached from the UI**, because the Zod schema refuses a blank name first, as Rename Account's does. The refusal test covers how a 422 would show (form alert, dialog stays open), and the mock still answers 422 for a client that skips the check.
- **Backend:** against a release without the backend's join-household ticket 03, `PATCH /me` answers 501, and the dialog shows that problem as its alert.
- **`make check`:** lint, typecheck, 454 unit tests, build, audit, contract check, 93 e2e and the image all pass.
  - One unrelated e2e test failed once: `account.spec.ts`, "the Add Account dialog works from the keyboard", at its last Escape.
  - It then passed 3 times out of 3 in a rerun, together with the touched specs, so it is flaky.
