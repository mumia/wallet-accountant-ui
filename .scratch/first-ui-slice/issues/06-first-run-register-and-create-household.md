# First run: register and create a Household

Status: done
Blocked by: 04, 05
Waits on backend: none

## What to build

Take a new User from sign-in to their first Household.

- The `/` redirect: unregistered → `/register`; no Household → `/households/new`; otherwise the last-used Household, or the first.
- `/register` as a centred card with Sign out: the signed-in email, **Invitation code**, **Redeem**. Success or a 409 goes to `/`. A 422 shows the problem as the form alert. `?invitation_code=` prefills the code and survives sign-in.
- `/households/new`: **Name**, and **Base currency** as a searchable combobox from `GET /currencies` (names from `Intl.DisplayNames`), with no default and the "can't be changed later" help. Success goes to the new Household's home (a stub until ticket 07).
- Error handling per **Talking to the API**: a form alert showing `title` + `detail`.

## Acceptance criteria

- [x] E2e covers: unregistered → redeem → create Household → home; the invitation link prefill; the invalid-code problem. axe passes on every state.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 3–6; First run; Screens and routes.

## Answer

Landed on 2026-11-21.

- **`/`** redirects in `beforeLoad` (`features/first-run/home-destination.ts`), from one read, `GET /households`:
  - a 403 `registration-required` goes to `/register`;
  - no Household goes to `/households/new`;
  - otherwise, the Household last opened in this browser (`lib/last-household.ts`, a guarded `localStorage`), or else the first.
  - Any other failure shows the root route's error screen with "Try again".
- **The router gets `{ api, queryClient }` as context** (`app/router.ts`), and is made at boot next to the API client. Loaders read with `queryClient.query(api.queryOptions(...))` and screens with `api.useSuspenseQuery`. Query 5.108 deprecates `fetchQuery` and `ensureQueryData` in favour of `query`.
- **`/register`**: a centred card with Sign out, "You're signed in as {email}…", **Invitation code** and **Redeem**.
  - Success and 409 both invalidate the Households read and go to `/`.
  - A 422 shows the problem in the form alert, and the code stays.
  - `?invitation_code=` prefills without submitting. It survives sign-in because the sign-in state already carries the whole path and query (a `returnPath` test case pins it).
- **`/households/new`**: **Name** (placeholder "Home") and **Base currency**, a Base UI Combobox over `GET /currencies` (loaded by the route), labelled "EUR — Euro" through `Intl.DisplayNames`, or the bare code when Intl has no name (ETH). It has no default, and the "can't be changed later" help is linked to it. Success goes to `/households/$householdId`, a stub until ticket 07.
  - **Glossary note:** the backend's `CONTEXT.md` says "A Household can change its Base currency", while the spec's help text says it can't. I kept the spec's text, which matches today's API (no change operation). Revisit if the backend adds one.
- **Forms**: React Hook Form 7.92 with `@hookform/resolvers` 7.0 and Zod schemas that mirror the contract's limits, with messages from the message files.
  - **Errors**: field errors are linked with `aria-describedby` and `aria-invalid`. Failed writes show `components/form-alert.tsx`, which shows the problem's `title` and `detail`, or our text for a network failure or an empty problem.
- **Shared parts**: `load-error.tsx` (inline error with "Try again"), `not-found.tsx`, `sign-out-button.tsx`, `error-text.ts`.
- **shadcn parts added**: input, card, alert, combobox and field, plus their dependencies input-group, separator and textarea. The CLI stopped at an overwrite prompt for `label.tsx`, so I reran it with `--overwrite` and restored our `label.tsx`. Three `// local:` changes:
  - `combobox.tsx`: the chevron and clear buttons get names from the message files. axe flagged the unnamed chevron.
  - `field.tsx`: two lint fixes (array style, a needless optional chain).
  - `input-group.tsx`: a reasoned `eslint-disable` for the click-to-focus convenience on the addon.
- **One axe exception, scoped and tested**: with the Combobox list open, Base UI deliberately hides the rest of the page from assistive tech (floating-ui's `markOthers` for a typeable combobox), so axe reports `aria-hidden-focus`. That one rule is off for that one scan (`comboboxListOpen` in `e2e/axe.ts`). A test shows that Escape and Tab close the list and remove the hiding, so nothing hidden is ever focusable.
- **The mock API is stateful now** (`mocks/db.ts`):
  - **Data**: in memory for tests (reset after each), in `sessionStorage` in mock mode.
  - **Scenarios**: `?mock-scenario=new-user | registered | household` starts the tab over.
  - **Words**: problems copy the backend's text word for word.
  - **Code**: the mock accepts `WELCOME-2026`.
- **e2e** (`e2e/first-run.spec.ts`, 7 tests, axe on every state):
  - unregistered → redeem → create Household → home, then `/` returns to it;
  - the Invitation link prefill;
  - the field error and the invalid-code problem;
  - a 409 going on;
  - Create Household's field checks;
  - an unknown Household is not found;
  - the combobox closing on Escape and Tab.
  - The appearance tests now wait for the mock Household's heading.
- **Not exercised**: Sign out's redirect, which needs a real Zitadel (ticket 20).
- **`make check`** passes: lint, typecheck, 318 unit tests, build, audit, contract, 19 e2e tests and the image.
