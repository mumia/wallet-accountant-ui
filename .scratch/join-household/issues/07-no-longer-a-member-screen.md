# 07: The "not a member of this Household" screen

Status: ready-for-agent
Blocked by: —
Waits on backend: no.

## What to build

The Household route (`src/routes/households/$householdId/route.tsx`) already throws `notFound()` on a 404 from `GET /households/{id}`. Give it its own not-found component in place of the app-wide default:

- the heading "You're not a member of this Household", with the spec's explanation;
- a **Go to your Households** link to `/`;
- forgetting the last-used Household when it's this one, so `/` doesn't send the User back here.

The same screen shows when the shell's Household query gets 404 on a refetch, for example on window focus after another member removed the caller.

## Acceptance criteria

- [ ] Opening an unknown or no-longer-accessible Household shows the screen, and its link goes to `/`, which leads elsewhere
- [ ] A 404 on refetch while the shell is open shows the same screen, not the generic error screen
- [ ] The last-used Household is forgotten only when it's the Household that 404'd
- [ ] Mock: a `mock-…` parameter (or an existing mock hook) that drops the caller from a Household mid-session
- [ ] E2e: direct visit; removed while open, then focus, then the screen. axe on the screen

## Spec

[spec.md](../spec.md): story 19; "Losing access".
