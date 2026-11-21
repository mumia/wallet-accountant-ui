# Add Account and the Account area

Status: done
Blocked by: 07
Waits on backend: none

## What to build

- The **Add Account** dialog: Name; Kind as radio cards with Bank account preselected and Cash never offered; Account currency preselected to the Base currency; Start date with a calendar popover, defaulting to the 1st of this month and capped at today; all the help texts from the spec. Success goes to the getting-started state.
- The Account area: a header with "Import statement" and the tabs To review, Transactions, Months, Statement imports and Connections (defaulting to Transactions). Each tab is a stub until its own ticket.
- The getting-started state at `…/accounts/:accountId` while the Account awaits its first Statement import: step 1 Create a Connection, step 2 Import the first statement (disabled until step 1 is done). Otherwise redirect to `transactions`.

## Acceptance criteria

- [x] E2e: add an Account and land on its checklist. The dialog is keyboard-operable and passes axe.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 15, 17; First run (Getting-started); Categories, Add Account and the Transaction list (Add Account); Screens and routes (Account area).

## Notes

- From ticket 07: `features/accounts/add-account-dialog.tsx` is a stub with `open` and `onOpenChange`, opened through `useOpenAddAccount()` from the sidebar (when the Household has no Accounts) and the overview. Replace its body with the form. After adding, invalidate `["get", "/households/{household_id}/accounts"]` so the sidebar and overview update.
- `routes/households/$householdId/accounts/$accountId.tsx` and `features/accounts/account-page.tsx` are a stub that loads `GET …/accounts/{id}` (a 404 shows "Not found" inside the shell). Replace them with the Account area. `components/account-labels.ts` has the kind labels and the balance or "Awaiting first Statement import".
- The mock API has `GET …/accounts` and `GET …/accounts/{id}` over `mocks/db.ts`; add `POST …/accounts`.

## Answer

Landed on 2026-11-21.

- **The Add Account dialog** (`features/accounts/add-account-dialog.tsx`):
  - **Name** (placeholder "Main").
  - **Kind** as radio cards: Bank account (preselected), Credit card, Loan, Crypto wallet. The list comes from the same `kindKeys` that is tested against the contract's `AccountKind`; Cash isn't in it, so it's never offered.
  - **Account currency**: the shared `components/currency-combobox.tsx` (moved out of the Household form), preselected to the Household's Base currency, with "It can't be changed later."
  - **Start date**: defaults to the 1st of this month and can't be later than today. The help text is the spec's.
  - **On success** it invalidates the Accounts read, so the sidebar and overview update, and opens the new Account's checklist.
  - The form mounts only while the dialog is open, so each opening starts from the defaults.
- **The date input** (`components/date-input.tsx`, `lib/date.ts`):
  - **Typing**: in the locale's order (`11/01/2026` in en-US, `01/11/2026` in en-GB), also reading `2026-11-01` and any separators. It formats on blur.
  - **Calendar**: a popover from shadcn's Calendar on react-day-picker 10. Days are named with `Intl`'s full date, because react-day-picker's "November 1st" failed axe's Label in Name (WCAG 2.5.3) against the visible "1". The popover opens on the chosen day, else today, and picking the chosen day again keeps it.
  - **Fixed upstream bug**: shadcn's `CalendarDayButton` never attached its `ref`, so focus didn't follow the arrow keys. It also defined its parts inside render, which remounted the grid on every render. Both are fixed as `// local:` changes, and a component test pins arrow-key picking across months.
  - `date-fns` comes through react-day-picker; we don't import it directly.
- **The Account area** (`features/accounts/account-area.tsx`): a layout route with the header (name; kind, currency and balance; **Import statement**) and the tabs To review, Transactions, Months, Statement imports and Connections.
  - The tabs are links in a `nav` (`aria-current` on the active one), not an ARIA tablist, because each is its own URL.
  - To review and Transactions carry `booking_month` (`lib/search.ts`, validated, `all` allowed).
  - Every tab is a stub, as are `connections/new` and `statement-imports/new` (with `connection_id`).
- **Getting started** at `…/accounts/:accountId`: while the Account awaits its first Statement import, a two-step checklist; otherwise a redirect to `transactions`.
  - Step 2 is a disabled button described by "Create a Connection first." until a Connection exists. Then it links to `statement-imports/new?connection_id=…`.
  - **Not as specified**: the spec has step 1 show "✓ with its name". Connections have no name in the pinned contract (a backend change in the handoff), so it shows "Connection created." for now.
- **Mock API**: `POST …/accounts` (with the backend's "Invalid Account" problem) and `GET …/connections`. Credit card now has a Connection but no import.
- **e2e** (`e2e/account.spec.ts`, 5 tests, axe on each state):
  - add an Account and land on its checklist;
  - the dialog by keyboard (radio arrows; refusing a date after today; calendar arrows and Enter; currency search; Escape);
  - the checklist with a Connection;
  - a non-awaiting Account redirecting to Transactions, with the tabs keeping `booking_month`;
  - 320 px reflow.
- **`make check`** passes: lint, typecheck, 344 unit tests, build, audit, contract, 36 e2e tests and the image.
