# Shell, Households and the Accounts overview

Status: done
Blocked by: 06
Waits on backend: none for this ticket. The To review counts and open month are ticket 19.

## What to build

The app shell and the Household's home.

- Left sidebar (a drawer on narrow screens) with the Household switcher and its "Create Household" dialog, Accounts (balance or "awaiting first Statement import"), Categories, a placeholder slot for the Notifications bell, and the User menu (name from the token, Appearance…, Sign out).
- The Household in the URL path (`/households/:householdId`), with the last-used Household remembered.
- The Accounts overview as a table with balance and Account currency, and the empty state "Add your first Account…". Its **Add Account** button opens ticket 08's dialog.
- The "not found" screen for links to anything the User can't see, and inline load errors with "Try again".
- The sidebar and overview read only `GET …/accounts`.

## Acceptance criteria

- [x] Switching Households changes the URL, and back/forward work.
- [x] The shell meets 320 px reflow and 200% zoom. axe passes. Focus is never hidden by the sidebar.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 8–12, 16; Screens and routes (Shell, Accounts overview).

## Notes

- From ticket 05: `components/appearance-dialog.tsx` is ready, with `open` and `onOpenChange`. Wire "Appearance…" in the User menu to it, and remove the Appearance… button from the Household home stub.
- From ticket 06: `/households/$householdId` is a stub (`features/households/household-home.tsx`) that saves the last-used Household (`lib/last-household.ts`) and has Appearance… and Sign out buttons; replace it with the shell and the Accounts overview, and keep saving the last-used Household. `components/sign-out-button.tsx` is ready for the User menu. The mock API's `household` scenario (the default) has one Household, "Home"; `e2e/appearance.spec.ts` waits for its heading.

## Answer

Landed on 2026-11-21.

- **The shell** (`features/shell/`): shadcn's Sidebar, which is a drawer (Sheet) below 768 px. It is the layout route `routes/households/$householdId/route.tsx`, whose loader reads the Household, the Households and `GET …/accounts`. Each Account shows its balance or "Awaiting first Statement import".
  - **Sidebar contents**, in order:
    - the Household switcher, a menu of radio items over the Households plus "Create Household…";
    - an empty slot for the Notifications bell;
    - "Accounts overview";
    - the Accounts, each with its balance, plus a small "Add Account" when there are none;
    - Categories;
    - the User menu: name and email from the token, Appearance…, Sign out.
  - A trigger in the content header shows or hides the sidebar at every width. That's on desktop too, because shadcn's Ctrl/Cmd+B can hide it there.
- **Create Household** from the switcher opens a dialog with the same form as `/households/new`. The form moved to `components/household-form.tsx`, and its messages to `common`. It now reads currencies with `useQuery`, so it shows a failure with "Try again" in place. On success it opens the new Household.
- **The Accounts overview** (`features/accounts/accounts-overview.tsx`) is a table of Account (with its kind), Account currency and balance (right-aligned, tabular digits). The empty state reads "Add your first Account…" with **Add Account**. Balances get no colour, per the spec, though the prototype coloured negatives.
- **Add Account** opens a stub dialog until ticket 08. The sidebar and the overview reach it through `useOpenAddAccount()`, provided by the layout route, so the shell and accounts features don't import each other.
- **Stubs**: the Account page (it loads the Account, so a 404 shows "Not found") and Categories.
- **Not found and load errors** are the router's defaults for every route, so inside a Household they show in the content area and the sidebar stays. Outside the shell they bring their own `<main>`.
- **Fixed along the way**:
  - **Reads retried four times, not three.** TanStack Query v5 passes `retry` the failures *before* the latest one (0 first). `api/retry.ts` and its test now say so.
  - **Extensible enums were broken in responses.** openapi-fetch's `Readable` maps `string & {}` as an object, so a response's `kind` stopped being a string. The generator now emits `` `${string}` ``. TypeScript folds the known values into it, so code that names them keeps its own list, tested against the contract (`src/test/contract.ts`, `extensibleEnum`). `src/test/` may now import `api`.
- **shadcn parts**: sidebar, sheet, tooltip, skeleton, dropdown-menu, table. Local changes:
  - translated names in the sheet's close button and the sidebar's drawer title, description and trigger;
  - small lint fixes in `sidebar.tsx`.
  - `lib/hooks/use-mobile.ts` was rewritten on `useSyncExternalStore`.
- **Mock API**:
  - The default scenario has "Home" with Main (€1,234.50) and Credit card (awaiting), and "Cabin" with no Accounts.
  - It serves `GET …/accounts` and `…/accounts/{id}`.
  - `?mock-fail=<path end>:<count>` injects 503s.
- **e2e**: `expectAccessible` now waits for running animations, since axe measured a sliding drawer's colours mid-way. `e2e/shell.spec.ts` has 11 tests with axe on each state:
  - the overview;
  - switching Households with back and forward, and `/` returning to the last one;
  - Create Household from the switcher;
  - Add Account from both places;
  - sidebar navigation with `aria-current`;
  - the User menu and Appearance…;
  - not found inside the shell;
  - load error, then "Try again";
  - focus never left of the sidebar while tabbing;
  - the drawer at 320 px with no sideways scroll;
  - 640 px for 200% zoom.
  - The appearance tests open Appearance… from the User menu.
- **`make check`** passes: lint, typecheck, 319 unit tests, build, audit, contract, 31 e2e tests and the image.
