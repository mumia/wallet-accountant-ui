# 09: Real-stack smoke test: a second member joins

Status: ready-for-agent
Blocked by: 04, 05
Waits on backend: **yes**. Needs a backend release (tag) that carries the merged `join-household` branch, deployed by `make local-deploy`. No contract change.

## What to build

Extend the real-stack smoke test (`smoke/`, first-ui-slice ticket 21):

1. After the first User has created a Household, the test issues an Invitation through the Members screen and reads the link from the dialog.
2. A second Zitadel user, created by `smoke.sh` like the first, with a random password kept in the test's environment only, signs in in a fresh browser context and opens the link.
3. They are forwarded to `/register`, give a display name and Redeem, and land in the first User's Household.
4. The test checks that both Users see two members, and that the first User's bell shows "{name} joined the Household".

This also closes join-household ticket 01's open item: the smoke test has never been run against v0.4.0 or later.

## Acceptance criteria

- [ ] `smoke.sh` creates the second Zitadel user and passes its credentials only through the environment
- [ ] `smoke.spec.ts` runs the steps above after the existing ones
- [ ] `make local-smoke` passes on a fresh cluster with the released backend. Note the backend tag in the Answer
- [ ] Tick join-household ticket 01's "real-stack smoke test passes" item

## Spec

[spec.md](../spec.md): "Testing Decisions" (real-stack smoke test); "Further Notes".
