# 09: Real-stack smoke test: a second member joins

Status: done
Blocked by: 04, 05
Waits on backend: no. v0.8.0 carries join-household (https://github.com/mumia/wallet-accountant/releases/tag/v0.8.0). No contract change.

## What to build

Extend the real-stack smoke test (`smoke/`, first-ui-slice ticket 21):

1. After the first User has created a Household, the test issues an Invitation through the Members screen and reads the link from the dialog.
2. A second Zitadel user, created by `smoke.sh` like the first, with a random password kept in the test's environment only, signs in in a fresh browser context and opens the link.
3. They are forwarded to `/register`, give a display name and Redeem, and land in the first User's Household.
4. The test checks that both Users see two members, and that the first User's bell shows "{name} joined the Household".

This also closes join-household ticket 01's open item: the smoke test has never been run against v0.4.0 or later.

## Acceptance criteria

- [x] `smoke.sh` creates the second Zitadel user and passes its credentials only through the environment
- [x] `smoke.spec.ts` runs the steps above after the existing ones
- [x] `make local-smoke` passes on a fresh cluster with the released backend. Note the backend tag in the Answer
- [x] Tick join-household ticket 01's "real-stack smoke test passes" item

## Spec

[spec.md](../spec.md): "Testing Decisions" (real-stack smoke test); "Further Notes".

## Answer

Done on 2026-11-25. The developer ran `make local-smoke` on a fresh cluster with the backend at **v0.8.0**, the first tag that carries join-household, and it passed. The second member joined through an Invitation link, both Members lists showed two members, and the first User's bell showed the joined Notification. This also ticks ticket 01's smoke-test item.

## Comments

- 2026-11-25: built. `smoke.sh` makes a second Zitadel user, `ui-smoke-2`, with its own random password, passed to the browser test only by name (`-e WA_UI_SECOND_USER -e WA_UI_SECOND_PASSWORD`). `smoke.spec.ts` keeps one test, since the new steps need the first User's Household: it issues an Invitation from Members and reads the link, signs the second User in from a fresh browser context, checks `/join` forwarded to `/register` with the code, Redeems as "Smoke joiner" and lands in the same Household, checks both Members lists and that the Invitation is used up, then reloads the first User's bell until it shows "Smoke joiner joined the Household". The test timeout went from 180 s to 300 s.
- Backend: join-household was merged to wallet-accountant main (5518c09) but untagged, so v0.8.0 was tagged from that commit (CI, Release and Smoke green on it).
- Not run yet: `make local-smoke` refuses to start while the developer's k3d cluster `wallet-accountant` exists, and that cluster was kept. Run `make local-down` in wallet-accountant, then `make local-smoke` here, with the backend checkout at v0.8.0. Then tick the last two boxes and ticket 01's, and note the result in an `## Answer`.
