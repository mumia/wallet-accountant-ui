# 05: The Join page, and `/register` sending Users to it

Status: done
Blocked by: —
Waits on backend: no for the mocks. The real API answers `createMembership` once a release carries the backend's join-household ticket 06.

## What to build

A new first-run route, `/join?invitation_code=…`:

- **On load** it reads `GET /me`. A 403 `registration-required` replaces the route with `/register?invitation_code=<code>`.
- **The card** has a prefilled **Invitation code** field and a **Join** button, which sends `POST /memberships`.
- **On 201:** invalidate `GET /households`, save the returned Household as the last-used one, then navigate to it, replacing the history entry.
- **On 409 (`already-a-member`):** the form alert plus a **Go to your Households** link to `/`.
- **On 422:** the form alert, input kept.

`/register`'s 409 (`already-registered`) now goes to `/join?invitation_code=<code>` instead of `/`.

## Acceptance criteria

- [x] `/join` route with the same search validation as `/register`. It keeps its search through sign-in, uses the first-run card with the Sign out link, and doesn't auto-submit
- [x] Unregistered: `/join?invitation_code=X` goes to `/register?invitation_code=X`
- [x] Success, 409 and 422 behave as above
- [x] `/register`: a 409 goes to `/join` with the code. An Unregistered person redeeming a Household code lands in that Household, which needs only a test since `/` already leads there
- [x] Mock: `POST /memberships` takes the fixed codes from the spec. A valid code adds the caller as a member of a seeded Household and answers 201 with it. The already-a-member code answers 409 `/problems/already-a-member`. Others answer 422 `/problems/invalid-invitation`, and an Unregistered caller 403. `POST /registrations` with the Household code also makes the new User a member
- [x] E2e: join, then land in the Household, then see it in the switcher; 409; 422; Unregistered forwarded with the code; `/register` 409 forwarded; register with a Household code. axe on each card state

## Spec

[spec.md](../spec.md): stories 6–11; "Screens and routes"; "Join page"; "`/register` changes".

## Answer

Landed on 2026-11-25.

- **The route** (`src/routes/join.tsx`) validates `invitation_code` like `/register` does.
  - Its `beforeLoad` reads `GET /me`. A 403 `registration-required` redirects to `/register`, keeping the code and replacing the history entry. Any other failure goes to the route's error screen.
  - Sign-in keeps the search through `session.ts`'s `returnTo`, as for `/register`.
- **The page** (`features/first-run/join-page.tsx`) lives in `first-run` because it reuses `FirstRunCard`, and a feature can't import another feature.
  - It shows "Join a Household", "You're signed in as {identity}. Someone has invited you to join their Household.", the prefilled **Invitation code** field (with `/register`'s messages) and **Join**. It never submits by itself.
  - **On 201:** save the Household as the last-used one, invalidate `GET /households`, then navigate to it, replacing the history entry.
  - **On 409:** the form alert plus **Go to your Households** (`/`).
  - **On 422 and anything else:** the form alert, input kept.
  - **A 403 on submit** goes to `/register` with the code, as on load.
- **`/register`:** a 409 `already-registered` now goes to `/join?invitation_code=<code>`. Redeeming a Household code as someone Unregistered already landed in that Household through `/`, so it only got a test.
- **The mock:**
  - `householdInvitationCodes` in `db.ts` are fixed codes. `JOIN-BEACH-2026` admits to "Beach house", a Household the mock User isn't in, and works once, tracked in `redeemedCodes`. `JOIN-HOME-2026` points at "Home", which they already belong to in the default scenario.
  - `POST /memberships` answers 403 for someone Unregistered, 422 for an unknown or used code, 409 `/problems/already-a-member` (the backend's words) with the code left unused, and otherwise 201 with the Household, now in `GET /households`.
  - `POST /registrations` with a Household code also makes the new User a member.
  - The `invalid-invitation` detail now uses the backend's current wording, which adds "revoked". `first-run.spec.ts` follows it.
  - Ticket 04 can turn these fixed codes into seeded Invitations once Invitations are in the mock.
- **Tests:**
  - `e2e/join.spec.ts`: join through a link (prefilled and not submitted, lands in the Household, the switcher lists it, `/` returns to it, the code is then used up); already a member (alert, link to `/`); invalid and empty codes; someone Unregistered forwarded to `/register` and landing in the Household. axe runs on each card state.
  - `first-run.spec.ts`: a 409 on `/register` goes to `/join`, then the User joins; someone new redeeming a Household code lands in it.
- **Backend:** against a release without the backend's join-household ticket 06, `POST /memberships` answers 501, and the Join page shows it as the form alert.
- **`make check`** passes: lint, typecheck, 454 unit tests, build, audit, contract check, 98 e2e tests and the image.
