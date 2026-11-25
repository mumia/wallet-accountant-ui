# 05: The Join page, and `/register` sending Users to it

Status: ready-for-agent
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

- [ ] `/join` route with the same search validation as `/register`. It keeps its search through sign-in, uses the first-run card with the Sign out link, and doesn't auto-submit
- [ ] Unregistered: `/join?invitation_code=X` goes to `/register?invitation_code=X`
- [ ] Success, 409 and 422 behave as above
- [ ] `/register`: a 409 goes to `/join` with the code. An Unregistered person redeeming a Household code lands in that Household, which needs only a test since `/` already leads there
- [ ] Mock: `POST /memberships` takes the fixed codes from the spec. A valid code adds the caller as a member of a seeded Household and answers 201 with it. The already-a-member code answers 409 `/problems/already-a-member`. Others answer 422 `/problems/invalid-invitation`, and an Unregistered caller 403. `POST /registrations` with the Household code also makes the new User a member
- [ ] E2e: join, then land in the Household, then see it in the switcher; 409; 422; Unregistered forwarded with the code; `/register` 409 forwarded; register with a Household code. axe on each card state

## Spec

[spec.md](../spec.md): stories 6–11; "Screens and routes"; "Join page"; "`/register` changes".
