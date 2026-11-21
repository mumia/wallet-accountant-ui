# Typed API client with exact money

Status: done
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

- [x] `1.000000000000000001` ETH and `100.00` EUR survive the round trip in both directions (unit tests).
- [x] The amount input passes keyboard/role component tests, including the caret never jumping while typing.
- [x] A mock that drifts from the contract is a type error.
- [x] A browser without source text access sees the unsupported-browser screen (the check is unit-tested; the screen is a component test, and an old browser itself is not tested).

## Spec

[spec.md](../../modern-frontend/spec.md): Money, Talking to the API (Idempotency-Key, Retries, Freshness), Testing Decisions. [ADR-0002](../../../docs/adr/0002-exact-money-in-the-browser.md).

## Answer

Landed on 2026-11-21.

- **Contract pin**: the backend has no release tags yet. The user chose to pin `v0.1.0`, the coming first release, in `src/api/CONTRACT_VERSION`. The copy in `src/api/openapi.yaml` is backend `main` at `5788472`. The `contract` job warns, without failing, until `v0.1.0` exists, then holds the copy to it. Checked all three outcomes against a real commit: match, drift and missing tag. `make contract-update ref=<tag or commit>` re-copies the file and regenerates.
- **Generator**: `scripts/generate-api.ts`, run by Node as TypeScript. `format: decimal` becomes `Decimal` (`` `${number}` ``), and `x-extensible-enum` becomes its values plus `(string & {})`. openapi-typescript 7.13 declares a TypeScript 5 peer, so an npm `overrides` entry gives it TypeScript 6, which has the same API; generation works and is reproducible. The `generated` job checks it.
- **Exact money**: `src/api/exact-json.ts` reads with a `context.source` reviver and writes with `JSON.rawJSON`, applied in an openapi-fetch middleware. Tests pin `1.000000000000000001` ETH and `100.00` EUR, both straight through the JSON functions and end to end through the client and MSW in each direction. TypeScript 6's lib lacks these APIs, so `src/api/json-source-text.d.ts` declares them.
- **Idempotency-Key, a change from the spec's wording**: there is no write hook. A client middleware keys every write by a fingerprint of its method, URL and body: reused after an error, new for a changed input, forgotten after a success. It covers every write, including TanStack's own retries, with no screen involved. Each rule is tested end to end.
- **Problems**: an error without a problem body gets one (`about:blank` plus the status), so retries and screens always see a status. Retry rules are in `src/api/retry.ts`, tested case by case.
- **Money module**: `src/lib/money.ts` (format, parse what was typed, display-only difference with big.js). Tested in en-US, de-DE and fr-FR, including 18-place ETH and a 4-letter code that Intl can't format as a currency.
- **Amount input**: `src/components/amount-input.tsx`, plain HTML until ticket 05 brings shadcn. Component tests cover the role and label, blur formatting, the caret not moving, the locale's separators, the too-many-places error linked by `aria-describedby`, and the invalid-input message after leaving the field.
- **MSW**: openapi-msw handlers in `src/mocks/` with a node server for tests (`onUnhandledFrame: "error"`, MSW 3's name for the option). A `@ts-expect-error` test proves a drifting mock fails typecheck. **Wiring MSW into the browser for dev and e2e moves to ticket 05**, which builds the e2e harness that needs it.
- **Image**: carries `wallet-accountant.min-api-version=v0.1.0`, and the image test checks the label.
- `make check` passes: 66 tests, plus the contract check, which warns.
