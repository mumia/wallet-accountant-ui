# 07: The "not a member of this Household" screen

Status: done
Blocked by: —
Waits on backend: no.

## What to build

The Household route (`src/routes/households/$householdId/route.tsx`) already throws `notFound()` on a 404 from `GET /households/{id}`. Give it its own not-found component in place of the app-wide default:

- the heading "You're not a member of this Household", with the spec's explanation;
- a **Go to your Households** link to `/`;
- forgetting the last-used Household when it's this one, so `/` doesn't send the User back here.

The same screen shows when the shell's Household query gets 404 on a refetch, for example on window focus after another member removed the caller.

## Acceptance criteria

- [x] Opening an unknown or no-longer-accessible Household shows the screen, and its link goes to `/`, which leads elsewhere
- [x] A 404 on refetch while the shell is open shows the same screen, not the generic error screen
- [x] The last-used Household is forgotten only when it's the Household that 404'd
- [x] Mock: a `mock-…` parameter (or an existing mock hook) that drops the caller from a Household mid-session
- [x] E2e: direct visit; removed while open, then focus, then the screen. axe on the screen

## Spec

[spec.md](../spec.md): story 19; "Losing access".

## Comments

**Built** (branch `build/join-household-07-not-a-member`):

- The Household's 404 is a `NotAMemberError` (`src/features/shell/not-a-member.tsx`), not `notFound()`, and the route's `errorComponent` (`HouseholdError`) shows "You're not a member of this Household" for it and `LoadError` for anything else. The reason: TanStack Router sends a child route's `notFound()` (an unknown Account, say) to the nearest route with a `notFoundComponent`. If the Household route had one, an unknown Account would read "not a member" instead of the usual "Not found" inside the shell.
- The shell throws the same error when its Household query's refetch gets 404. A refetch error keeps the old data, so `useSuspenseQuery` doesn't throw on its own.
- On showing, the screen forgets the last-used Household when it's this one (`forgetLastHousehold`, which ticket 06's Leave can reuse) and invalidates `GET /households`, so `/` doesn't lead back here.
- Mock: `?mock-remove-me=<Household ID>:<count>`. After `<count>` more successful reads of that Household, a member removes the User from it (documented in `docs/architecture/conventions.md`).
- E2e: `e2e/not-a-member.spec.ts` covers the direct visit (another remembered Household stays remembered) and removal while open (clock moved 31 s past the stale time, then a `visibilitychange`). The old "a Household that isn't the User's is not found" test in `first-run.spec.ts` moved there.
