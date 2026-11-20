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
  - Static build only: no Node server at runtime. Self-hosting is Kubernetes with a Helm chart (backend ADR-0019, ADR-0020); the UI ships as an image that meets the backend's **UI contract**, `../wallet-accountant/docs/architecture/ui-contract.md`, which binds every ticket.
  - Desktop first, responsive.
  - English only at launch, but adding a language must be easy: every user-facing string is in message files from day one, and numbers, dates and money are formatted for the locale.
  - Look and feel uses a ready-made design system, chosen by reacting to rough prototypes.
- **Backend changes must be obvious**: a ticket whose resolution needs a change in `wallet-accountant` writes it under a `## Backend changes` heading in its Answer, tags its Decisions-so-far line with **⚠️ backend**, and adds a line to the Backend changes section below.

## Decisions so far

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist. Tag with ⚠️ backend when it needs a backend change. -->

- [Research: framework and build tooling for a static, strict-TypeScript web app](issues/01-research-framework-and-build-tooling.md): leaning React 19 + Vite 8 + TanStack Router + TanStack Query + react-i18next; TS 6 vs 7 left open.
- [Research: design systems and component libraries for a data-heavy finance app](issues/04-research-design-systems-for-a-data-heavy-finance-app.md): prototype shadcn/ui + TanStack Table against Mantine 9; MUI, Ant Design and React Aria ruled out.
- [Research: generating a typed API client from the OpenAPI contract](issues/02-research-typed-api-client-from-openapi.md): leaning openapi-typescript + openapi-fetch + openapi-react-query, contract committed pinned to a backend SHA; money exact via JSON reviver, or a contract change to strings.
- [Research: signing in to Zitadel from a browser app](issues/03-research-signing-in-to-zitadel-from-a-browser-app.md): **⚠️ backend (proposed, since covered by backend ADR-0022)** new User Agent app `web`, oidc-client-ts with refresh tokens in sessionStorage, no BFF; suggests same-origin via a proxy on `/api`.
- [Grilling: choose the application stack](issues/05-grilling-choose-the-application-stack.md): React 19 + Vite 8, TypeScript 6 (7.1 later), TanStack Router + Zod 4, TanStack Query, openapi-typescript/fetch/react-query, react-i18next, React Hook Form, TanStack Table, oidc-client-ts; no client state library.
- [Grilling: exact money in the browser](issues/06-grilling-exact-money-in-the-browser.md): **⚠️ backend** `Money.amount` stays a JSON number, read and written exactly in the UI (reviver + `JSON.rawJSON`, 2025+ browsers); new `GET /currencies` for decimal places; own amount input; `big.js` for display-only maths.
- [Grilling: how the UI is served next to the API](issues/07-grilling-how-the-ui-is-served-next-to-the-api.md): **⚠️ backend** mostly settled by the backend's UI contract (Kubernetes route, API under `/api`, `/config.json`); UI image on Caddy tested read-only in CI, Vite on HTTPS proxying `/api`, a UI `make local-deploy`, contract pinned to a backend release tag.
- [Grilling: screens and navigation for the first slice](issues/08-grilling-screens-and-navigation-for-the-first-slice.md): Household in the URL path; Account-centric tabs (To review, Transactions, Months, Statement imports, Connections); left sidebar; Accounts overview as home; Notifications bell; "To review" added to `CONTEXT.md`. Overview reads deferred to the last ticket.
- [Prototype: look and feel](issues/09-prototype-look-and-feel.md): shadcn/ui (Base UI, base-nova) + TanStack Table; default preset A "Ledger" in dark, presets B–D and light selectable and saved in the browser; comfortable density; the Category tree picker and list virtualisation are ours to build.
- [Grilling: repo conventions and tooling](issues/10-grilling-repo-conventions-and-tooling.md): npm, Node LTS only in Docker behind Make; strictest tsconfig; ESLint strict-type-checked + Prettier; by-feature layout with file routes; Vitest + Testing Library + MSW (openapi-msw), Playwright e2e on mocks; CI and releases mirror the backend.

## Backend changes

<!-- every change the UI needs in wallet-accountant, one line each, linking the ticket that decided it. This list ships with the UI spec as the backend handoff. -->

- ✅ Done (backend commit `a182e39`). New endpoint `GET /currencies` listing each currency code with its decimal places: [Grilling: exact money in the browser](issues/06-grilling-exact-money-in-the-browser.md).
- Environment repo local values: the Vite dev server's redirect URIs for `web`, `ui.enabled` with the UI image, its base image in `images.lock`: [Grilling: how the UI is served next to the API](issues/07-grilling-how-the-ui-is-served-next-to-the-api.md).

## Not yet specified

- **How each flow works in detail**, once the screens and design system are settled: the CSV mapping editor; the first Statement import with the Export balance typed twice and the Opening balance preview; the Accept / Keep / Discard review list (bulk actions? keyboard-driven?); how Month close shows every refusal reason; Reverse and Void confirmations; how fresh Notifications must be (polling interval, badge).
- **Talking to the API, beyond the client itself**: how problem+json errors are shown to the user, where Idempotency-Keys are generated and kept across retries, how cursor pagination appears (infinite scroll vs pages), and what happens when the access token expires mid-action.
- **Registration and first run**: the contents of `/register` (Redeem Invitation, and how the generic invalid-code error reads) and `/households/new`, and the Account's getting-started state. Their routing is settled.
- **The accessibility bar** we commit to, now that it is shadcn/ui on Base UI: what Base UI gives, and what our own parts (Category tree picker, money input, bulk selection) must meet.
- **Where the theme setting lives in the UI** (User menu? a settings page?) for choosing a preset and light or dark.
- **Assembling the handoff**: the final UI spec (in the shape of the backend's `spec.md`) plus the Backend changes list, and two ADRs in `docs/adr/` (Application stack, Exact money in the browser) per [Grilling: repo conventions and tooling](issues/10-grilling-repo-conventions-and-tooling.md).

## Out of scope

- Planning screens (Budgets, Scheduled transactions, Forecasts): no API yet.
- A native phone app or an installable PWA.
- Translations beyond English (making them easy to add is in scope).
- Building the frontend itself.
- Syncing the theme choice across devices through the backend: browser storage at launch, the backend later ([Prototype: look and feel](issues/09-prototype-look-and-feel.md)).
