# 03: The Members screen

Status: done
Blocked by: 02
Waits on backend: no for the mocks. The real API answers `listMembers` once a release carries the backend's join-household ticket 08.

## What to build

A new route `…/members`, reached from **Members** in the sidebar, below Categories. It shows a table of the Household's members from `GET …/members`, oldest first as served:

- **Name:** the display name, or "No name yet" in muted text;
- **Joined:** a locale date.

Your own row says "(you)", found by comparing `user_id` with `GET /me` from ticket 02. If you have no name, it also has a **Set your name** link that opens ticket 02's dialog.

Leave space for later tickets: ticket 04 adds the open Invitations section under the table, and ticket 06 adds Remove and Leave.

## Acceptance criteria

- [x] Route, sidebar link (users icon, active state like the other links) and screen heading "Members"
- [x] The members table, with "(you)", "No name yet" and **Set your name**
- [x] The usual loading and failed-load ("Try again") states. A 404 goes to the Household route's not-found screen
- [x] Mock: in-memory members per Household, with the mock User as the creator. A `mock-…` parameter seeds a second member
- [x] E2e: one member, two members, a member with no name. axe on each

## Spec

[spec.md](../spec.md): story 15; "Screens and routes"; "Members screen".

## Answer

Landed on 2026-11-25.

- **The route** `…/members` (`routes/households/$householdId/members.tsx`) loads `GET …/members` and starts `GET /me` without waiting for it. A 404 throws `notFound({ routeId: "/households/$householdId" })`, so it shows the Household route's not-found screen, which ticket 07 gives its own component. Any other failure is the usual LoadError with "Try again".
- **The sidebar** has **Members** (`UsersIcon`) in its own group below Categories, active like the other links.
- **The screen** (`features/members/members-page.tsx`) has the heading "Members" in a header row with room for ticket 06's Leave button, then the table, labelled by the heading, with **Name** and **Joined** (`dateStyle: "medium"`). Ticket 04's Invitations section goes under the table.
  - Your own row says "(you)", by `useMe()`'s `user_id`. Until `GET /me` answers, no row is marked.
  - With no name, your row reads "No name yet (you) **Set your name**". The button opens the Your name dialog.
- **The Your name dialog moved** from `features/shell/` to `components/your-name-dialog.tsx`, because one feature may not import another (`boundaries/dependencies`). Its strings moved from `shell.yourName.*` to `common.yourName.*`.
- **Messages:** a new `members` namespace (`locales/en/members.json`), and `shell.members` for the sidebar link.
- **The mock:**
  - `MockState.members` keeps each Household's members, oldest first. A Household missing from it has `seededMembers`: the mock User created Home (2026-01-01) and Cabin, and Rui is Beach house's only member.
  - The mock User's entry carries no name. `GET …/members` gives them `state.displayName`, so a `PATCH /me` shows up in the list.
  - `POST /households` and joining (`/memberships`, or `/registrations` with a Household code) add the mock User as the newest member.
  - `?mock-member=Ana` adds a member named Ana to the User's first Household, after any `mock-scenario`, joined 2026-03-11. `?mock-member=` adds one with no name. It can be repeated.
  - `mockUserId` now lives in `mocks/db.ts`.
- **Tests:**
  - `src/mocks/member-handlers.test.ts`: the list follows `PATCH /me`, seeded members, joining and creating, and the 404;
  - `e2e/members.spec.ts`: the sidebar link and its active state, one member, two members, a member with no name, your own nameless row with Set your name, and a failed load with Try again. axe runs on each state.
- **Not e2e-tested:** a 404 from `GET …/members` alone. In the mock, a non-member gets 404 on `GET /households/{id}` first, so the Household route's loader shows the not-found screen before this route's loader runs.
- **Backend:** against a release without the backend's join-household ticket 08, `GET …/members` answers 501 and the screen shows that problem with "Try again".
- **`make check`:** lint, typecheck, 458 unit tests, build, audit, contract check and the image pass. E2e: 102 of 103 passed. The one failure was `account.spec.ts` "the Add Account dialog works from the keyboard" at its Escape step, the flake ticket 02 recorded. It then passed 3 times out of 3 in a rerun with `members.spec.ts`.
