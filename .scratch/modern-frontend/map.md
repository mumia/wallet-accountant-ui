# Map: A modern frontend for Wallet Accountant

Label: wayfinder:map

## Destination

A spec ready to hand off for the frontend's first UI slice: the stack, design system and repo conventions locked, the screens of the backend's first vertical slice specified, and a clearly separated list of the backend changes the UI needs. Building the app is the next effort, not this one.

## Notes

- **Domain**: a frontend in this repo for the Go backend at `../wallet-accountant`. Vocabulary comes from `../wallet-accountant/CONTEXT-MAP.md` and its `CONTEXT.md` files; screens use those terms exactly. The first UI slice matches the backend's first slice: `../wallet-accountant/.scratch/statement-import-to-month-close/spec.md` (sign in and register, Households, Categories, Accounts, Connections and CSV mapping, Statement import, Accept / Keep / Discard / Reverse, Month close, Notifications). The API is `../wallet-accountant/api/openapi.yaml`.
- **Skills**: grilling tickets call `grilling` and `domain-modeling`; research tickets call `research`; prototype tickets call `prototype`.
- **Hard requirement**: any JavaScript is TypeScript, as strictly typed as the tooling allows. API types are generated from the OpenAPI contract, never written by hand (backend ADR-0008).
- **Standing preferences**:
  - The user is not a frontend engineer. Prefer mainstream, well-documented options with strong community and agent support over the newest ones, and explain trade-offs in plain terms.
  - Static build only: no Node server at runtime, so self-hosting (backend ADR-0005, Compose) gains no new runtime.
  - Desktop first, responsive.
  - English only at launch, but adding a language must be easy: every user-facing string is in message files from day one, and numbers, dates and money are formatted for the locale.
  - Look and feel uses a ready-made design system, chosen by reacting to rough prototypes.
- **Backend changes must be obvious**: a ticket whose resolution needs a change in `wallet-accountant` writes it under a `## Backend changes` heading in its Answer, tags its Decisions-so-far line with **⚠️ backend**, and adds a line to the Backend changes section below.

## Decisions so far

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist. Tag with ⚠️ backend when it needs a backend change. -->

- [Research: framework and build tooling for a static, strict-TypeScript web app](issues/01-research-framework-and-build-tooling.md): leaning React 19 + Vite 8 + TanStack Router + TanStack Query + react-i18next; TS 6 vs 7 left open.
- [Research: design systems and component libraries for a data-heavy finance app](issues/04-research-design-systems-for-a-data-heavy-finance-app.md): prototype shadcn/ui + TanStack Table against Mantine 9; MUI, Ant Design and React Aria ruled out.
- [Research: generating a typed API client from the OpenAPI contract](issues/02-research-typed-api-client-from-openapi.md): leaning openapi-typescript + openapi-fetch + openapi-react-query, contract committed pinned to a backend SHA; money exact via JSON reviver, or a contract change to strings.
- [Research: signing in to Zitadel from a browser app](issues/03-research-signing-in-to-zitadel-from-a-browser-app.md): **⚠️ backend (proposed)** new User Agent app `web`, oidc-client-ts with refresh tokens in sessionStorage, no BFF; suggests same-origin via a proxy on `/api`.
- [Grilling: choose the application stack](issues/05-grilling-choose-the-application-stack.md): React 19 + Vite 8, TypeScript 6 (7.1 later), TanStack Router + Zod 4, TanStack Query, openapi-typescript/fetch/react-query, react-i18next, React Hook Form, TanStack Table, oidc-client-ts; no client state library.
- [Grilling: exact money in the browser](issues/06-grilling-exact-money-in-the-browser.md): **⚠️ backend** `Money.amount` stays a JSON number, read and written exactly in the UI (reviver + `JSON.rawJSON`, 2025+ browsers); new `GET /currencies` for decimal places; own amount input; `big.js` for display-only maths.

## Backend changes

<!-- every change the UI needs in wallet-accountant, one line each, linking the ticket that decided it. This list ships with the UI spec as the backend handoff. -->

- New endpoint `GET /currencies` listing each currency code with its decimal places, from `internal/sharedkernel/currency.go`: [Grilling: exact money in the browser](issues/06-grilling-exact-money-in-the-browser.md).

## Not yet specified

- **How each flow works in detail**, once the screens and design system are settled: the CSV mapping editor; the first Statement import with the Export balance typed twice and the Opening balance preview; the Accept / Keep / Discard review list (bulk actions? keyboard-driven?); how Month close shows every refusal reason; Reverse and Void confirmations; how fresh Notifications must be (polling interval, badge).
- **Talking to the API, beyond the client itself**: how problem+json errors are shown to the user, where Idempotency-Keys are generated and kept across retries, how cursor pagination appears (infinite scroll vs pages), and what happens when the access token expires mid-action.
- **Registration and first run**: the screen for someone who signed in but has no Invitation, redeeming the code, creating the first Household.
- **The accessibility bar** we commit to, likely set by the chosen design system.
- **Assembling the handoff**: the final UI spec (in the shape of the backend's `spec.md`) plus the Backend changes list.

## Out of scope

- Planning screens (Budgets, Scheduled transactions, Forecasts): no API yet.
- A native phone app or an installable PWA.
- Translations beyond English (making them easy to add is in scope).
- Building the frontend itself.
