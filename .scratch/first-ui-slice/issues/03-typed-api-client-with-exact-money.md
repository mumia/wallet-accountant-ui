# Typed API client with exact money

Status: open
Blocked by: 01
Waits on backend: none (pins the current release tag; re-pinned as backend changes land)

## What to build

Generate the API client from the pinned contract and make money exact from end to end.

- Copy `api/openapi.yaml` from a backend release tag into `src/api/`. Generate `schema.gen.ts` with openapi-typescript, mapping `format: decimal` to a decimal-string alias. Add `client.ts` (openapi-fetch + openapi-react-query, relative `/api` URLs) and TanStack Query with a 30 s stale time and refetch on focus.
- Money module: a response middleware using a `JSON.parse` reviver with `context.source`, request serialisation with `JSON.rawJSON`, `Intl.NumberFormat` display, and `big.js` for display-only maths. Only this module touches an amount's raw value.
- Start-up detection of JSON source text access, with an "unsupported browser" screen.
- The shared **amount input** component, with the behaviour and accessibility rules from the spec.
- The write wrapper: an Idempotency-Key per submit, reused on retry and replaced when the input changes; retries on network errors and 502/503/504; the button disabled while in flight. Read retries on network errors and 5xx.
- MSW with openapi-msw handlers, shared between dev and tests.
- CI jobs `generated` (regenerate, then `git diff --exit-code`) and `contract` (the copy equals the file at the pinned tag). Add the image label.

## Acceptance criteria

- [ ] `1.000000000000000001` ETH and `100.00` EUR survive the round trip in both directions (unit tests).
- [ ] The amount input passes keyboard/role component tests, including the caret never jumping while typing.
- [ ] A mock that drifts from the contract is a type error.
- [ ] A browser without source text access sees the unsupported-browser screen.

## Spec

[spec.md](../../modern-frontend/spec.md): Money, Talking to the API (Idempotency-Key, Retries, Freshness), Testing Decisions. [ADR-0002](../../../docs/adr/0002-exact-money-in-the-browser.md).
