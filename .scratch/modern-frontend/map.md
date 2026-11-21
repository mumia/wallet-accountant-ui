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
- **Backend grilling prompt**: the handoff ([Task: assemble the handoff](issues/19-task-assemble-the-handoff.md)) gathers every Backend change into one prompt for the `grilling` skill in `wallet-accountant`.

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
- [Grilling: talking to the API](issues/12-grilling-talking-to-the-api.md): Zod per-field checks, server problems as a form alert or a toast, shown untranslated (`title` + `detail`); Idempotency-Key made on first submit and reused on retry; writes retry on network/502–504 only; a chosen month loads in full, otherwise infinite scroll; session end → sign in again by redirect; 30 s stale time, Notifications polled every 60 s.
- [Grilling: the accessibility bar](issues/13-grilling-the-accessibility-bar.md): WCAG 2.2 AA target; axe in Playwright as the gate, keyboard/role component tests, a token contrast test, a manual VoiceOver checklist; all eight themes tuned to AA on their own; row-labelled checkboxes; Category picker on Base UI Combobox with groups (not cmdk); ESLint pinned to 9 for jsx-a11y.
- [Grilling: the To review list](issues/14-grilling-the-to-review-list.md): Suspected duplicates section above Pending, Resembles box inline; per-row Category picker (parents pickable, grouped by kind, starts on Uncategorised); bulk via one request per row; optimistic, no Undo, Discard confirmed; no shortcuts; `booking_month` and `state=SUSPECTED_DUPLICATE` in the URL.
- [Grilling: the CSV mapping editor](issues/15-grilling-the-csv-mapping-editor.md): **⚠️ backend** full-page editor creates the Connection with its mapping; Connections get a name; a sample file is read in the browser to guess settings and pick columns, rows previewed by a new backend test endpoint; header vs position never asked; Zod mirrors the rules; new `encoding` (UTF-8, Windows-1252); editing affects future imports only.
- [Grilling: the Statement import flow](issues/16-grilling-the-statement-import-flow.md): stepper as prototyped; Connection preselected from the latest import, `?connection_id=` deep link; any file type, only empty refused; Export balance help per glossary (booked, no pending card payments); second entry blocks paste; preview adds file/Connection and zero-row/ignored-rows notes; refusals rendered by the problem's fields; result links to To review. No backend changes.
- [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md): **⚠️ backend** one open month per Account, closed in order, Reopen for the latest; closed months lock money but not Category; four-state month screen with blockers up front and a live difference; Reverse only in the open month with exact wording; Void disabled by `void_blocked_by`.
- [Grilling: registration, first run and the theme setting](issues/18-grilling-registration-first-run-and-the-theme-setting.md): `/register` and `/households/new` as centred cards with Sign out; invalid code shown as the backend's problem; `?invitation_code=` prefills; Base currency with no default and "can't be changed later"; empty Accounts overview; two-step getting-started checklist; Appearance dialog in the User menu with Light / Dark / System. No backend changes.
- [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md): **⚠️ backend** new `GET …/months` list (every month, unpaged, from creation); `pending`, `suspected_duplicates` and required `open_month` on `Account`; `NOT_OPEN_YET` month state; sidebar and overview read only `GET …/accounts`.

## Backend changes

<!-- every change the UI needs in wallet-accountant, one line each, linking the ticket that decided it. This list ships with the UI spec as the backend handoff. -->

- ✅ Done (backend commit `a182e39`). New endpoint `GET /currencies` listing each currency code with its decimal places: [Grilling: exact money in the browser](issues/06-grilling-exact-money-in-the-browser.md).
- Environment repo local values: the Vite dev server's redirect URIs for `web`, `ui.enabled` with the UI image, its base image in `images.lock`: [Grilling: how the UI is served next to the API](issues/07-grilling-how-the-ui-is-served-next-to-the-api.md).
- A required, renameable `name` on Connection, unique within the Account: [Grilling: the CSV mapping editor](issues/15-grilling-the-csv-mapping-editor.md).
- An `encoding` field on `CsvMapping` (UTF-8, Windows-1252; absent means UTF-8): [Grilling: the CSV mapping editor](issues/15-grilling-the-csv-mapping-editor.md).
- A CSV mapping test endpoint: unsaved mapping + sample file → first rows as parsed, or unreadable lines: [Grilling: the CSV mapping editor](issues/15-grilling-the-csv-mapping-editor.md).
- Contract only: `date_format`, `decimal_separator`, `thousands_separator` as `x-extensible-enum`: [Grilling: the CSV mapping editor](issues/15-grilling-the-csv-mapping-editor.md).
- One open month per Account, closed one at a time once ended; a closed month locks money and descriptions (Accept, Keep, Discard, Reverse refused; Category changeable, never to Uncategorised); `flagged` removed; changes the Ledger glossary's Month close: [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md).
- Reopen the latest closed month, refused while the open month has Accepted Transactions; `reopen_blocked` on `AccountMonth`: [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md).
- Statement import rows in months not open yet land pending but can't be acted on; rows in closed months are ignored and counted (Balance check treatment left to the backend grilling): [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md).
- Void refused when the import touches a closed month; `void_blocked_by` on `StatementImport`: [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md).
- `unchecked_statement_imports` on `AccountMonth`: [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md).
- `imported_transaction_id` on `AccountTransaction`: [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md).
- New `GET …/accounts/{account_id}/months`: every Booking month as `AccountMonth`, newest first, unpaged, from the start date's month to the later of the current month and the last booked row, answering from creation: [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md).
- `pending` and `suspected_duplicates` counts on `Account`, over the whole Account: [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md).
- Required `open_month` on `Account` (the start date's month at creation): [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md).
- `NOT_OPEN_YET` in `AccountMonth.state`: [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md).

## Not yet specified

Nothing left: the remaining fog graduated into tickets on 2026-11-20 (the API behaviours, the accessibility bar, the To review list, the CSV mapping editor, the Statement import flow, Month close with Reverse and Void, first run with the theme setting, and assembling the handoff).

## Out of scope

- Planning screens (Budgets, Scheduled transactions, Forecasts): no API yet.
- A native phone app or an installable PWA.
- Translations beyond English (making them easy to add is in scope).
- Building the frontend itself.
- Syncing the theme choice across devices through the backend: browser storage at launch, the backend later ([Prototype: look and feel](issues/09-prototype-look-and-feel.md)).
- Updates pushed from the backend to the UI (e.g. websockets) in place of polling: to investigate later, as its own effort ([Grilling: talking to the API](issues/12-grilling-talking-to-the-api.md)).
