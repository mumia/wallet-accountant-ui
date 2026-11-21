# Research: generating a typed API client from the OpenAPI contract

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: research
Status: resolved
Blocked by:

## Question

Which tool should generate the frontend's TypeScript client from `../wallet-accountant/api/openapi.yaml` (OpenAPI 3, Zalando guidelines, ogen on the server), and how does the contract reach this repo?

Compare at least openapi-typescript + openapi-fetch, Hey API (`@hey-api/openapi-ts`) and Orval against the actual contract, on:

- Type fidelity: request and response bodies, path and query params, enums, `oneOf`, nullable vs optional.
- `Money.amount` is `type: number, format: decimal`. What does each generator emit, can it be mapped to a string or a decimal type, and what would change if the contract made it a string?
- `application/problem+json` errors: are they typed per operation?
- Cursor pagination (`Cursor`, `Limit` parameters) and `Idempotency-Key` headers.
- Integration with a server-state cache (TanStack Query) and with request interceptors (attaching the bearer token, refreshing it).
- Runtime footprint, maintenance health, docs.

Also list the options for getting the contract into this repo and keeping it in sync (copy plus CI check, git submodule, fetching from the running backend, a published artifact), with trade-offs.

Findings feed [Grilling: choose the application stack](05-grilling-choose-the-application-stack.md) and [Grilling: exact money in the browser](06-grilling-exact-money-in-the-browser.md).

## Answer

Findings: `research/typed-api-client-from-openapi.md` on branch `research/typed-api-client-from-openapi` (not pushed). All three generators were run against the real contract, type-checked under the strictest config, sized, and tested for decimal exactness.

**Recommendation (not final): openapi-typescript + openapi-fetch, with openapi-react-query for TanStack Query.** Types only, ~2.6 kB gzip runtime, zero errors under the strictest config, ~17–18 M weekly downloads.

- **Risks:** no release since Feb 2026; the generator crashes with TypeScript 7 installed (issue #2841). Hey API crashes too, Orval doesn't. Workaround: run the generator with a pinned TS 5.9. Decide the TS version first; if TS 7 with no workaround is wanted, Orval is the fallback.
- **Orval:** most active, only one with errors typed per status; drops `Idempotency-Key` unless `headers: true`, and serialises the body before the custom fetcher (awkward for decimals).
- **Hey API:** richest Query helpers but pre-1.0 (pin exact version); its copied-in client has 12 strict-mode errors and `@ts-ignore` in infinite queries.
- **Money:** all three emit `amount: number`; ETH `1.000000000000000001` becomes `1`, `100.00` loses zeros. Each can type amounts as strings; at runtime a `JSON.parse` reviver with `context.source` reads exact text and `JSON.rawJSON` writes exact numbers. Tested end to end, type-checks. Needs Chrome/Edge 114, Firefox 135, Safari 18.4+.
- **Contract sync:** commit a copy pinned to a backend commit SHA; an `api:update` script fetches it from GitHub; CI fails on drift of the copy or the generated types. Runner-up: git submodule. Fetching from a running backend isn't possible (it doesn't serve its spec).

## Backend changes (none required; suggestions for [Grilling: exact money in the browser](06-grilling-exact-money-in-the-browser.md) to decide)

- Keep `Money.amount` a JSON number on purpose (Zalando-aligned; advice: keep for now, every decimal in a property named `amount`) **or** switch to a string, removing the UI's decimal handling.
- Serve or publish the contract, only if moving off the pinned copy.
- Optional: make `CsvColumn` a real `oneOf`.
- Optional: `enum` instead of `x-extensible-enum` for small closed sets the UI branches on (generators turn the latter into `string`).
