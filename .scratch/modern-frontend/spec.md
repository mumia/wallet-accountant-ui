# Spec: the first UI slice (Statement import → Accept → Month close)

Status: final (2026-11-21): fully decided, ready to hand off. The backend changes it depends on are tracked in [backend-handoff.md](backend-handoff.md).

The first slice of the Wallet Accountant UI, matching the backend's first slice (`../wallet-accountant/.scratch/statement-import-to-month-close/spec.md`). A User signs in, redeems an Invitation, creates a Household, adds Accounts and Categories, describes a bank's CSV file in a Connection, imports Statement files, works through what is To review, and closes each month. It also builds the frontend's walking skeleton: the stack, the API client with exact money, sign-in, the theme system, the Caddy image that meets the backend's UI contract, and CI.

Every decision here was made in a ticket on the [map](map.md); each section links the ticket that holds the detail and the reasons. Domain terms come from `../wallet-accountant/CONTEXT-MAP.md`; the only UI-only term, **To review**, is in this repo's `CONTEXT.md`.

The UI needs backend changes before some screens can be built. They are listed on the map under **Backend changes** and handed to the backend as [backend-handoff.md](backend-handoff.md). Screens that depend on one say so.

## Problem Statement

The backend can import statements, Accept rows and close months, but only through its HTTP API. Nobody can use it without Bruno or curl. A Household needs screens that make the monthly routine plain: bring the bank's file in, decide each row, see what still blocks the month, and close it. The person maintaining the frontend is not a frontend engineer, so the stack must be mainstream, strictly typed and well known to coding agents. Money must never be rounded on its way through the browser.

## Solution

A static single-page app in React and strict TypeScript, served by its own Caddy image on the same origin as the API (`/api`). It signs in to Zitadel in the browser and calls the API with a bearer token. Its API types are generated from the pinned OpenAPI contract, and amounts travel as exact decimal text, never as JS numbers.

The User lands on their Household's Accounts overview. A left sidebar lists the Accounts with their balance and how many rows are To review. Each Account has tabs: To review, Transactions, Months, Statement imports and Connections. A new Account walks the User through a two-step checklist: create a Connection, then import the first statement. The Statement import flow is a stepper that previews the Opening balance on the first import. To review lists Suspected duplicates above Pending rows, with a Category picker per row and bulk actions. One month per Account is open; its screen lists every blocker up front and closes with the Statement balance.

The look is shadcn/ui on Base UI with Tailwind, the "Ledger" preset in dark by default, with three more presets and light mode in an Appearance dialog. Every string is in message files, and money, numbers and dates are formatted for the locale.

## User Stories

### Signing in and first run

1. As a User, I want to sign in through Zitadel in the browser, so that the UI never sees my password.
2. As a User, I want my session to renew quietly while I work, and to be asked to sign in again (and brought back to the same page) when it can't, so that a long review isn't cut short without warning.
3. As someone signed in but not registered, I want a page that says I need an Invitation and lets me type its code, so that I can join.
4. As someone with an Invitation link, I want `/register?invitation_code=…` to prefill the code through the sign-in round trip, so that I only press Redeem.
5. As someone who signed in with the wrong identity, I want to sign out from the registration and Create Household pages, so that I can switch.
6. As a new User, I want to create my first Household with a name and a Base currency, told that the currency can't be changed later, so that I choose it deliberately.
7. As a User with an unsupported browser, I want a clear "unsupported browser" screen instead of an app that might show a wrong amount.

### The shell and Households

8. As a User, I want a left sidebar with a Household switcher, my Accounts with their balance and To review count, Categories, a Notifications bell and my User menu, so that I can reach everything from one place.
9. As a User, I want the Household in the URL, so that links and the browser's back button work, and `/` to take me to the last Household I used.
10. As a User, I want to create another Household from the switcher.
11. As a User, I want an Accounts overview as my Household's home, with each Account's balance, currency, To review count and open month.
12. As a User, I want a plain "not found" screen when a link points at something I can't see.
13. As a User, I want to choose a theme preset and Light, Dark or System in an Appearance dialog, saved in this browser.

### Categories and Accounts

14. As a User, I want to see my Household's Category tree, Internal Categories included, shown as Expense, Income and Internal sections, and create, rename and move my own Categories from small dialogs.
15. As a User, I want to add an Account from a dialog, choosing its Account currency from the currencies the backend knows, and land on its getting-started checklist.
16. As a User, I want an empty Household to tell me to add my first Account.
17. As a User, I want a new Account to show "Create a Connection → Import the first statement" until its first Statement import, with no made-up balance.
17a. As a User, I want to rename an Account, because its other details can't be changed after it is added (⚠️ backend).

### Connections and CSV mapping

18. As a User, I want to create a named Connection by describing my bank's CSV file on one page, so that the mapping is saved with the Connection.
19. As a User, I want to open a sample statement file and have the editor guess the encoding, delimiter, header row, date format and decimal separator, so that I mostly confirm guesses.
20. As a User, I want to pick each column by clicking it in the sample, without being asked about header names or positions.
21. As a User, I want to see how the backend will read the first rows of my sample before I save, so that I find mistakes before an import fails.
22. As a User, I want mapping mistakes shown on their fields before I save.
23. As a User, I want to be told that editing a mapping affects future imports only, and how to re-read a file already imported.

### Statement import

24. As a User, I want the Connection preselected (the one my last import used), or skipped when there is only one.
25. As a User, I want to drop a file and type its Export balance, with help on what the Export balance is.
26. As a User importing an Account's first statement, I want to type the Export balance twice and preview the Opening balance before confirming.
27. As a User, I want a refusal to show what went wrong in the shape that fits it: unreadable lines as a table, a failed Balance check as three amounts with likely causes, a duplicate file with a link to the earlier import.
28. As a User, I want the result to show what was imported, skipped and suspected, and take me to the rows To review.

### To review

29. As a User, I want Suspected duplicates shown above Pending rows, each beside the earlier row it resembles, with what differs marked in text.
30. As a User, I want to Accept a row with the Category I pick in that row, or leave it Uncategorised.
31. As a User, I want to Accept, Keep or Discard many rows at once and be told how many succeeded.
32. As a User, I want a Discard confirmed first, because it is final.
33. As a User, I want to narrow To review to one month, or to Suspected duplicates only when I come from a Notification.
34. As a User, I want Pending rows booked in a month that isn't open yet shown but locked, with the reason, and Suspected duplicates there decidable now.

### Transactions

35. As a User, I want an Account's Transactions as a single-entry list with signed amounts, filtered by Booking month, and an Uncategorised filter.
36. As a User, I want to change a Transaction's Category in its row, also in a closed month (never to Uncategorised there).
37. As a User, I want to Reverse a Transaction in the open month, told exactly what happens, and see the reversal linked to its original.
38. As a User, I want the Transactions tab to open on the Account's open month, and to narrow a month to its Uncategorised Transactions with one toggle.

### Months, Month close and Void

39. As a User, I want an Account's months listed newest first with their state and counts.
40. As a User, I want the open month's screen to list every blocker up front, each linking to where it is fixed.
41. As a User, I want to type the Statement balance and see the computed balance and the difference live before I close.
42. As a User, I want to Reopen the latest closed month when I find a mistake, and be told when I can't and why.
43. As a User, I want the Statement imports of all an Account's Connections in one list, and to Void the latest one when allowed, or see why not.

### Notifications

44. As a User, I want a bell with an unread count that keeps itself up to date, and a panel listing Notifications.
45. As a User, I want a Suspected duplicates Notification to take me to that Account's Suspected duplicates and mark itself read.

### Quality

46. As a User of a screen reader or the keyboard alone, I want every screen to work and meet WCAG 2.2 AA.
47. As a User in another locale, I want amounts, numbers and dates in my locale's format; as a maintainer, I want a new language to be a new folder of message files.

## Implementation Decisions

### Stack

From [Grilling: choose the application stack](issues/05-grilling-choose-the-application-stack.md), recorded as [ADR-0001](../../docs/adr/0001-application-stack.md).

- React 19 + Vite 8, static SPA build. TypeScript 6 with the strictest settings; move to 7.1 once typescript-eslint and openapi-typescript support it.
- TanStack Router (file-based routes, search params validated with Zod 4), TanStack Query 5, TanStack Table with TanStack Virtual for long lists.
- openapi-typescript + openapi-fetch + openapi-react-query. Fallback if unmaintained: Orval.
- React Hook Form + Zod 4; react-i18next with type-safe keys, one JSON namespace per feature; `Intl` for money, numbers and dates.
- oidc-client-ts 3.5 + react-oidc-context: authorization code with PKCE, refresh tokens, `sessionStorage`. No backend-for-frontend; it is the upgrade path if this becomes a hosted service ([Research: signing in to Zitadel](issues/03-research-signing-in-to-zitadel-from-a-browser-app.md)).
- No client state library: server data in Query, view state in the URL, form state in React Hook Form, the session in react-oidc-context.
- shadcn/ui on Base UI (`base-nova` style) with Tailwind 4 ([Prototype: look and feel](issues/09-prototype-look-and-feel.md)). Parts are added with `make ui-add c="…"` (the pinned shadcn CLI with `--yes`, in the Node container) and updated by hand with `--overwrite` and a diff review; our edits to `components/ui/` are marked `// local:`. TanStack Table **v9**. The four preset fonts are bundled from Fontsource variable packages and served from the app's own origin, never from Google Fonts ([Grilling: loose ends from the look-and-feel prototype](issues/21-grilling-loose-ends-from-the-look-and-feel-prototype.md)).

### Money

From [Grilling: exact money in the browser](issues/06-grilling-exact-money-in-the-browser.md), recorded as [ADR-0002](../../docs/adr/0002-exact-money-in-the-browser.md).

- `Money.amount` stays a JSON number. The generator maps `format: decimal` to a plain decimal-string alias. One API-client middleware parses responses with a `JSON.parse` reviver that reads `context.source`; requests are serialised with `JSON.rawJSON`. Only the money module touches an amount's raw value.
- Start-up detects JSON source text access (Chrome/Edge 114, Firefox 135, Safari 18.4) and shows an "unsupported browser" screen without it.
- Currency decimal places come from `GET /currencies` (done in the backend). Display needs no lookup.
- `big.js` only inside the money module, only for figures shown and never sent (the Month close difference).
- **Amount input** (ours): a text field with `inputMode="decimal"`, the locale's separators and a typed leading minus; more places than the currency has is an inline error; it stores canonical `DecimalText` (`-1234.56`) and formats on blur only.
- **Display**: `Intl.NumberFormat` fed the decimal string, always the currency's places, a plain minus, no income/expense colour (colour marks only differences, always with text or an icon), right-aligned tabular digits in tables.
- Tests pin `1.000000000000000001` ETH and `100.00` EUR both ways.

### Serving, configuration and the dev loop

From [Grilling: how the UI is served next to the API](issues/07-grilling-how-the-ui-is-served-next-to-the-api.md). The backend's **UI contract** (`../wallet-accountant/docs/architecture/ui-contract.md`) binds the image.

- One origin: the gateway sends `/api` and `/api/*` to the app and every other path to the UI. API calls use relative URLs under `/api`.
- **Caddy** image: port 8080, non-root, read-only root filesystem (the chart mounts an empty writable `/tmp`), `persist_config off`, `admin off`, `GET /healthz`, SPA fallback to `index.html`, `immutable` caching for `/assets/*` and `no-cache` for `index.html` and `config.json`. No Node at runtime.
- The UI fetches `/config.json` before starting (`apiBaseUrl`, `oidc.{issuer, clientId, audience, redirectPath, postLogoutRedirectPath}`), validated by a Zod schema that strips unknown keys. `/auth/callback` is a reserved route. The stand-in UI in the backend's chart tests (`deploy/helm/wallet-accountant/test/stand-in-ui`) is a working example of sign-in against the local Zitadel.
- **Dev**: Vite on `https://localhost:5173` with the mkcert certificate from `make local-ca`; `/api` proxied unchanged to `https://wallet.localhost:18443` by default, or to `make run` on `http://localhost:8080` via one environment variable; `npm run dev:config` writes a git-ignored `public/config.json` from the cluster's OIDC ConfigMap.
- `make local-deploy` builds the image, pushes it to the k3d registry and sets `ui.enabled` and the tag in the environment repo's local values (needs the environment repo changes in the handoff).
- The contract is pinned to a **backend release tag**; releases carry it as the image label `wallet-accountant.min-api-version`. No runtime version check.

### Repo conventions

From [Grilling: repo conventions and tooling](issues/10-grilling-repo-conventions-and-tooling.md), amended by [Grilling: the accessibility bar](issues/13-grilling-the-accessibility-bar.md). The build effort writes them up as `docs/architecture/conventions.md`, following the outline in the ticket.

- npm with `package-lock.json`, `npm ci`, `save-exact=true`. Node only in Docker, the Active LTS, one source of truth in `.node-version`. Make is the only entry point; npm scripts hold the definitions; `node_modules` in a named volume; `make check` runs every CI check. No git hooks.
- tsconfig: `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. A flag a library makes unworkable is turned off alone, with the reason recorded.
- ESLint **9** (until jsx-a11y supports 10) with typescript-eslint `strict-type-checked` + `stylistic-type-checked`, Prettier, and `react-hooks`, `jsx-a11y` (strict), the TanStack Query and Router plugins, `i18next/no-literal-string`, `import/no-extraneous-dependencies`, `eslint-plugin-boundaries`. No `any`, no non-null `!`, `--max-warnings 0`. shadcn parts in `components/ui/` meet the same rules (reasoned `eslint-disable` allowed only there). Generated files are excluded.
- Layout by feature: `src/app/` (boot), `src/routes/` (thin file routes), `src/features/<area>/`, `src/components/ui/` (shadcn), `src/components/` (money input, Category picker, data table), `src/api/` (pinned `openapi.yaml`, `schema.gen.ts`, `client.ts`), `src/lib/`, `src/locales/en/*.json`.
- CI jobs, each mirroring a `make` target: `lint` (with actionlint), `typecheck`, `generated` (regenerate API types and the route tree, `git diff --exit-code`), `contract` (the copy equals the file at the pinned tag), `test`, `e2e`, `image`, `audit` (`npm audit --omit=dev`, high). Actions pinned to SHAs; Renovate weekly, grouped.
- Releases as in the backend: `vX.Y.Z` tag → `ghcr.io/mumia/wallet-accountant-ui:vX.Y.Z` and a GitHub Release; `main` → `main-<sha>`; provenance attestation and the `min-api-version` label.

### Talking to the API

From [Grilling: talking to the API](issues/12-grilling-talking-to-the-api.md).

- **Errors**: Zod mirrors the contract's limits per field before sending. A form's failed request → an alert at the top of the form, input kept. A one-click action → a toast naming the row. A screen's failed load → an inline error with "Try again". A 404 → "not found".
- **Error text**: the problem's `title` and `detail`, untranslated. Without a problem body, a generic message from our message files. The UI keeps **no list of problem types**: problems with extra fields (`rows`, `reasons`, `statement_import_id`, balance fields) are rendered by the screens that own them, by which fields they carry.
- **Idempotency-Key**: every write, created on the first submit, reused on retry, replaced when the input changes after an error. One write wrapper owns keys; the submit button is disabled while in flight.
- **Retries**: reads on network errors and 5xx; writes twice, same key, on network errors and 502/503/504 only.
- **Long lists**: with `booking_month`, every page of the month loads (limit 200); without, infinite scroll with virtualisation and "Showing N so far".
- **Session**: background renewal with the refresh token; a 401 triggers one renewal and one resend; failed renewal shows "Your session has ended — Sign in again" and returns to the same URL.
- **Freshness**: 30 s stale time, refetch on focus; writes invalidate what they affect (Accept, Keep, Discard, Reverse, Statement import, Void, Close and Reopen also invalidate the Accounts and months reads). Notifications polled every 60 s while visible, on focus, and ~3 s and ~10 s after a Statement import.

### Accessibility

From [Grilling: the accessibility bar](issues/13-grilling-the-accessibility-bar.md).

- Target WCAG 2.2 AA (a target, not a certified claim). Gate: `@axe-core/playwright` per screen and state on every PR. Our own parts are tested by keyboard and role in component tests. A unit test checks each theme's token contrast (text 4.5:1; controls, borders, focus rings 3:1). Manual keyboard + VoiceOver pass before each release.
- Work around and test the open Base UI bugs [#6275](https://github.com/mui/base-ui/issues/6275), [#5659](https://github.com/mui/base-ui/issues/5659), [#6284](https://github.com/mui/base-ui/issues/6284). Every Dialog has a title, a description and a visible close.
- Bulk selection: plain checkboxes labelled from the row ("Select 12 Mar, Albert Heijn, −23.40 EUR"), header checkbox with a mixed state, Shift+click ranges, a polite "3 selected" announcement.
- Money input: visible label, currency in the label or a described suffix, error linked with `aria-describedby` and `aria-invalid`, caret never moved while typing.
- **Category picker**: Base UI Combobox. Every Category is an indented option searchable by full path ("Food › Groceries"), grouped by kind: Uncategorised first, then Expense, then Income. Parents can be picked. Other Internal Categories are hidden ([Grilling: the To review list](issues/14-grilling-the-to-review-list.md)).
- `prefers-reduced-motion`, 200% zoom and 320 px reflow (wide tables scroll in their own box), focus never hidden by sticky parts, 24×24 px targets.

### Look and feel

From [Prototype: look and feel](issues/09-prototype-look-and-feel.md) and [Grilling: registration, first run and the theme setting](issues/18-grilling-registration-first-run-and-the-theme-setting.md).

- Default preset A "Ledger" (neutral greys, Inter, small radius) in Dark. Presets B Teal, C Ink, D Warm and Light / Dark / System, built as shadcn CSS tokens switched on `<html>`. All eight combinations are tuned to AA on their own token profile; the user looks at any preset whose character changes visibly.
- **Appearance…** in the User menu opens a dialog with the four swatches and Light / Dark / System; changes apply live and are saved in `localStorage`. Comfortable density only.
- The prototype (`prototypes/look-and-feel/shadcn/` on branch `prototype/look-and-feel`, commit `3da18dd`) is the visual reference for the shell, To review and the Statement import flow, not code to copy: its Category picker is replaced as above.

### Screens and routes

From [Grilling: screens and navigation for the first slice](issues/08-grilling-screens-and-navigation-for-the-first-slice.md). `…` is `/households/:householdId`.

| Route | Screen |
|---|---|
| `/auth/callback` | Sign-in callback |
| `/register` | Redeem Invitation (API: 403 `registration-required`) |
| `/households/new` | Create Household, when the User has none |
| `/` | Redirect: Unregistered → `/register`; no Household → `/households/new`; else the last-used Household (or the first) |
| `…` | Accounts overview |
| `…/categories` | Category tree |
| `…/accounts/:accountId` | Getting-started checklist while awaiting the first Statement import, else redirect to `transactions` |
| `…/accounts/:accountId/to-review` | To review (`booking_month`, `state=SUSPECTED_DUPLICATE`) |
| `…/accounts/:accountId/transactions` | Transactions (`booking_month`) |
| `…/accounts/:accountId/months` | The Account's months |
| `…/accounts/:accountId/months/:bookingMonth` | One month and Month close |
| `…/accounts/:accountId/statement-imports` | Statement imports (`statement_import_id` highlights one) |
| `…/accounts/:accountId/statement-imports/new` | Statement import flow (`connection_id` skips step 1) |
| `…/accounts/:accountId/connections`, `…/new`, `…/:connectionId` | Connections and the CSV mapping editor |

- **Shell**: left sidebar (a drawer on narrow screens): Household switcher with "Create Household" (a dialog), Accounts (balance or "awaiting first Statement import", To review count; a small "Add Account" link when empty), Categories, the Notifications bell (dropdown panel, no page), the User menu (name from the token, Appearance…, Sign out). No Instance administrator area.
- **Account area**: header with "Import statement" on every tab; tabs To review, Transactions, Months, Statement imports, Connections; default Transactions. `booking_month` is kept when switching between To review and Transactions.
- **Accounts overview**: a table of Accounts with balance, Account currency, To review (`pending + suspected_duplicates`) and "Open month: October 2026" linking to that month, or "awaiting first Statement import"; "Add Account" opens the dialog. Sidebar and overview read only `GET …/accounts` ([Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md), ⚠️ backend).

### First run

From [Grilling: registration, first run and the theme setting](issues/18-grilling-registration-first-run-and-the-theme-setting.md).

- `/register` and `/households/new` are centred cards without the sidebar, each with a small **Sign out** link, using the saved theme.
- `/register`: "You're signed in as {email}, but you need an Invitation to use Wallet Accountant", **Invitation code**, **Redeem**. Success or a 409 → `/`. The 422 shows the problem as the form alert. `?invitation_code=` prefills without submitting and survives sign-in.
- `/households/new`: welcome line, **Name** (placeholder "Home"), **Base currency** as a searchable combobox from `GET /currencies` ("EUR — Euro", the name from `Intl.DisplayNames`) with no default and the help "The currency your Household's totals are shown in. It can't be changed later." → the new Household's home.
- Empty Accounts overview: "Add your first Account. Each bank account or card you want to track is one Account." with **Add Account**.
- Getting-started state: header and tabs stay, none selected; step 1 **Create a Connection** ("Tell us how your bank's statement files are laid out", ✓ with its name once one exists); step 2 **Import the first statement** ("Use a file covering everything from {start date} to today. Its Export balance sets the Opening balance."), disabled until step 1 is done.

### Categories, Add Account and the Transaction list

From [Grilling: the Categories screen, Add Account and the Transactions tab](issues/20-grilling-categories-add-account-and-transactions-tab.md).

- **Categories**: three sections, Expense, Income, then Internal, each an indented tree, all expanded at first. Internal is muted with a lock, "Created by Wallet Accountant. Can't be renamed or moved.", and no row actions. "New Category" in the Expense and Income headers creates a root Category; the row menu has "Add sub-Category" (dialog shows "Under: Food › Eating out"), "Rename…" and "Move…". Create and Rename share a one-field **Name** dialog; kind is never asked. Move uses the Category picker limited to the same kind, without the Category and its sub-Categories, plus "Top level". No drag and drop, not optimistic. A 409 `category-name-taken` shows on the Name field; other refusals are the form alert. No Delete (out of scope).
- **Add Account** (dialog): **Name** (placeholder "Main"); **Kind** as radio cards Bank account, Credit card, Loan, Crypto wallet, Bank account preselected, Cash never offered; **Account currency** combobox preselected to the Base currency, "It can't be changed later."; **Start date** typed with a calendar popover, default the 1st of the current month, capped at today, help "The day this Account's history begins. Your first statement file must cover from this day to today; rows booked before it are ignored. It can't be changed later." Success → the getting-started state.
- **Rename Account**: "Rename…" in a small menu on the Account header beside "Import statement", a one-field dialog, 1–200 characters (⚠️ backend).
- **Transactions**: columns Booking date (Transaction date under it when different), Description, Amount (right-aligned, signed), Category picker, row menu (Reverse only, hidden where it doesn't apply). No payee or running balance. The Opening balance Transaction, reversals and reversed rows show the Category as text.
  - Month field as in To review, offering every month; no `booking_month` means the open month; `booking_month=all` lists all months oldest first with infinite scroll.
  - "Uncategorised only (7)" toggle chip, `uncategorised=true`, client-side, enabled only for a single month ("Choose a month first"). The Month close Uncategorised blocker links here.
  - The row picker saves on pick, optimistic, rolled back with a toast, no Undo. With the Uncategorised filter on, a categorised row stays until the filter changes or a reload.
  - Empty: "No Transactions in March 2026" with "Show all months" (and "Go to To review" when it has rows To review); filtered: "Everything in March 2026 has a Category ✓" with "Show all Transactions".

### CSV mapping editor

From [Grilling: the CSV mapping editor](issues/15-grilling-the-csv-mapping-editor.md). ⚠️ backend for the name, the encoding and the test endpoint.

- `…/connections/new` is the full-page editor; Save creates the Connection with its mapping in one request (no kind picker, never a Connection without a mapping), then returns to where the User came from (Connections tab or the Statement import flow). `…/connections/:connectionId` is the same page for editing and renaming. Leaving with unsaved changes asks first.
- Fields: **Name** (required, prefilled "Statement file", then "Statement file 2", …); encoding (UTF-8, Windows-1252), delimiter, header row, lines to skip; date format, decimal and thousands separators; amount layout (one signed column, or debit and credit) and, for signed, whether positive is money in or out; columns: Booking date, description, amount (or debit and credit) required, Transaction date, Value date, payee, bank transaction ID optional.
- The editor writes `header` columns when the file has a header row and `position` otherwise; the User only picks a column. Choice labels are in message files, with a test that the known values match the contract's enums; an unknown saved value shows as-is.
- **Sample file**: read in the browser only to guess encoding (UTF-8 when valid, else Windows-1252), delimiter, header row, date format and decimal separator, and to show a table whose columns are picked by clicking (dropdowns work without a sample). "How rows will read" comes from the backend's test endpoint, never from a second parser.
- Zod mirrors the mapping rules before Save (required columns per layout, a column used twice, a header column without a header row, equal separators, name blank or too long); server refusals (including a duplicate name) are the form alert.
- With existing Statement imports, a note above Save: "Changes apply to future imports. To re-read a file already imported, Void its Statement import and import it again", linking to Statement imports.
- Connections tab: each Connection by name with an "Import statement" row action (deep link with `connection_id`).

### Statement import flow

From [Grilling: the Statement import flow](issues/16-grilling-the-statement-import-flow.md), as prototyped: a stepper, one card per step.

1. **Connection**: skipped with one; a radio list by name with several, preselecting the latest import's Connection, else the first by name; with none, "Create a Connection" (returns here). `?connection_id=` skips the step and shows the name with "Change". A Connection without a mapping is listed disabled with "Needs a CSV mapping — Edit".
2. **File and Export balance**: a drop zone (any file; only an empty file is refused; no size limit of ours); the Export balance with "Your bank's booked balance when you exported this file, in {currency}. Leave out card payments still marked as pending." On the first import a second field "Export balance, again" with **paste blocked** and a mismatch on blur or Preview. The button reads **Preview** on a first import, **Import** otherwise.
3. **Opening balance preview** (first import): the Opening balance large with "= Export balance − rows total", rows to import, rows ignored, rows total, file and Connection names; a warning when `row_count` is 0; a note on rows ignored before the start date (and in closed months, ⚠️ backend). Back keeps the inputs; a reload starts over. Preview and Confirm each get their own Idempotency-Key.
4. **Result**: "Statement imported", the Balance check badge (`WAITING` explained), Imported, Skipped as certain repeats, Suspected duplicates, Ignored, and the Opening balance on a first import. "Review N rows" → To review (with `state=SUSPECTED_DUPLICATE` when there are any); "Nothing new in this file" when nothing was imported; "Back to the Account".

**Refusals** are the alert of the step that sent the request, keeping the inputs, rendered by fields: `rows` → a Line | Reason table of the first 20 and a link to the mapping editor; `expected_balance` / `export_balance` / `difference` → the three amounts and a fixed hint (mistyped Export balance, a pending card payment, a gap since the last import, an inverted sign), with links to the mapping editor and Statement imports; `statement_import_id` → "See the earlier import"; anything else → `title` + `detail`.

### To review

From [Grilling: the To review list](issues/14-grilling-the-to-review-list.md), amended by [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md) and [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md).

- Two sections, **Suspected duplicates** then **Pending**, each hidden when empty, from two queries by `state` with the chosen `booking_month`. Suspected duplicates load in full. API order, no column sorting. Columns: checkbox, Booking date (Transaction date under it when different), payee and description, amount, Category (Pending only), actions.
- Suspected duplicate: a dashed "Resembles: 12 Mar · Albert Heijn · −23.40 EUR · Accepted" box, differences marked in text; Keep and Discard. Kept rows move to Pending with the box still shown.
- Each Pending row has a Category picker starting on Uncategorised; Accept sends what it shows.
- Bulk bar: **Accept as [Category]**, **Keep**, **Discard**, each only when it applies to every selected row. One request per row, about 4 at a time, each with its own key; "18 Accepted, 2 failed", failed rows stay selected.
- Optimistic: Accept and Discard remove the row, Keep moves it; on failure it returns with a toast. No Undo; the Accept toast reads "Accepted · View in Transactions". Discard is confirmed (one dialog for one or many). A 409 for a row already Accepted or Discarded refetches and toasts "Already Accepted"; it is not a failure.
- No keyboard shortcuts.
- Filters: a month field with arrows and "All months", offering only months with rows To review (⚠️ backend months list); `state=SUSPECTED_DUPLICATE` shows only that section, with "Show everything".
- Pending rows booked in a month not open yet show no Accept or Discard and can't be selected, with "February 2026 isn't open yet" (⚠️ backend month rules). A Suspected duplicate there can still be Kept or Discarded; once Kept it is Pending, and locked.
- Empty states: "Nothing to review" (link to Transactions); "Nothing to review in March 2026" with "Show all months" and "Go to March 2026".

### Months, Month close, Reverse and Void

From [Grilling: Month close, Reverse and Void](issues/17-grilling-month-close-reverse-and-void.md) and [Grilling: overview reads the backend must serve](issues/11-grilling-overview-reads-the-backend-must-serve.md). All of it rests on the backend's new month rules (⚠️ backend): one open month per Account, closed in order once ended; a closed month locks money and descriptions but not Category (never to Uncategorised); Reopen for the latest closed month.

- **Months tab**: the months list newest first, each row with month, state badge (Open, Closed, Not open yet) and counts, linking to the month screen.
- **Month screen**, with ← / → arrows; outside the Account's months, "not a month of this Account":
  - **Open**: blockers up front (pending, Suspected duplicates, Uncategorised, unchecked Statement imports), each linking to its fix. The **Close month** form has one field, the Statement balance, with "Computed balance €X · Difference €Y" live under it, the help "Nothing is booked to make them meet: find and correct the wrong entry" and a link to the month's Transactions. Close is always enabled; under it, "Closing makes January 2026 read-only, except Categories, and opens February 2026." A refusal replaces the blockers with the problem's `reasons` and details, input kept. Success → the next month with a toast. Before the month ends, the form is disabled: "You can close November 2026 from 1 Dec 2026."
  - **Closed**: Statement balance, "Closed on …", a Closed badge, **Reopen** on the latest closed month, with the dialog "Reopen January 2026? February 2026 goes back to not open yet and January becomes editable again. You'll need to close January again with its Statement balance." Disabled when `reopen_blocked`, with "February 2026 has Accepted Transactions. Reverse them first".
  - **Not open yet**: "Close December 2025 first" with a link, the month's pending count, and, when there are any, "2 Suspected duplicates can be decided now", linking to To review for that month, Suspected duplicates only.
  - **Awaiting the first Statement import**: the getting-started state.
- **Reverse** (Transactions row menu): only in the open month, not on reversals, reversed Transactions or the Opening balance Transaction. Dialog "Reverse "Coffee", −€3.50 on 15 Jan 2026? A reversal with the opposite amount is recorded on the same date; both stay in the list." plus, when `imported_transaction_id` is set, "Its Imported transaction goes back to To review, to be Accepted again or Discarded." Destructive **Reverse**. No optimistic update; a toast with an **Open** link. A reversed original is muted with a "Reversed" badge linking to its reversal; a reversal shows "Reversal of …"; neither has a strikethrough or a Category picker, and the Uncategorised filter leaves both out. Rows in a closed month: Category picker without Uncategorised, no Reverse, a lock icon explaining "January 2026 is closed".
- **Statement imports tab**: all the Account's Connections' imports, newest first, with Connection, Export balance, row counts and the Balance check badge (FAILED hints "Void it and import a corrected file."); voided imports muted with "Voided on …". Void is enabled only when `void_blocked_by` is empty; otherwise disabled with the reason and a fix link. Dialog "Void the import of 3 Feb 2026 (42 rows)? Its Imported transactions become Discarded and the file can be imported again.", plus the first-import sentence about the Opening balance. Afterwards a toast with **Import statement**.

### Notifications

- The bell's badge counts unread from the list in the browser; the panel lists Notifications. Clicking a `SUSPECTED_DUPLICATES_FOUND` one marks it read and opens that Account's To review with `state=SUSPECTED_DUPLICATE`. `kind` is an extensible enum: as with the CSV mapping's choices, an unknown value is shown as-is (here, with no link).

## Testing Decisions

From [Grilling: repo conventions and tooling](issues/10-grilling-repo-conventions-and-tooling.md) and [Grilling: the accessibility bar](issues/13-grilling-the-accessibility-bar.md).

- **What a good test is**: it drives the UI the way a User does (by role, label and keyboard) and asserts on what the User sees or what goes over the network. It never mocks the API client or hooks.
- **Unit (Vitest)**: pure logic: money parsing, formatting and the reviver/serialiser round trip, CSV mapping rules and sample-file guessing, Zod schemas, the config schema, theme token contrast, message-file choice labels against the contract's enums.
- **Component (Vitest + Testing Library, jsdom)**: our own parts driven by keyboard and role: the amount input, the Category picker, bulk selection, the CSV mapping editor's column picking.
- **API mocking**: MSW at the network level with handlers typed by **openapi-msw**, so a drifting mock is a type error. The same handlers serve dev and e2e.
- **End-to-end (Playwright, official Docker image)**: against the built app with MSW, on every PR, with an axe scan per screen and state, failing on any violation. Covers every flow above, including each refusal shape.
- **Image**: CI runs the built Caddy image as the chart does and checks `/healthz`, the SPA fallback and cache headers.
- **Later**: a real-stack smoke on the local k3d cluster (sign in, import a statement, close a month), specified when the build reaches it. No coverage threshold.

## Out of Scope

- Building the frontend: this spec is its input.
- Planning screens (Budgets, Scheduled transactions, Forecasts): no API yet.
- A native phone app or an installable PWA.
- Translations beyond English (adding one stays easy).
- Translating backend problem text.
- Syncing the theme choice across devices through the backend.
- Updates pushed from the backend (websockets) instead of polling.
- Issuing Invitations, an Instance administrator area, and everything else outside the backend's first slice.
- A backend-for-frontend.
- Deleting or archiving a Category: the backend has no such operation.

## Further Notes

- **Backend first.** Screens marked ⚠️ backend can't be finished until the backend grilling in [backend-handoff.md](backend-handoff.md) lands its changes and a backend release tag carries them. Everything else (the skeleton, sign-in, first run, Categories, the CSV mapping editor without the test endpoint, Statement import, To review) can start on the current contract.
- **Research findings** behind the stack live on unpushed `research/*` branches named in tickets 01–04.
- The UI contract now has the chart mount an empty writable `/tmp`; [Grilling: how the UI is served next to the API](issues/07-grilling-how-the-ui-is-served-next-to-the-api.md) assumed no writable mount at all. CI's image test follows the contract.
