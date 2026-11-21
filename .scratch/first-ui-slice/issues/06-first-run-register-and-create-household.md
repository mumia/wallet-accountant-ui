# First run: register and create a Household

Status: open
Blocked by: 04, 05
Waits on backend: none

## What to build

Take a new User from sign-in to their first Household.

- The `/` redirect: unregistered → `/register`; no Household → `/households/new`; otherwise the last-used Household, or the first.
- `/register` as a centred card with Sign out: the signed-in email, **Invitation code**, **Redeem**. Success or a 409 goes to `/`. A 422 shows the problem as the form alert. `?invitation_code=` prefills the code and survives sign-in.
- `/households/new`: **Name**, and **Base currency** as a searchable combobox from `GET /currencies` (names from `Intl.DisplayNames`), with no default and the "can't be changed later" help. Success goes to the new Household's home (a stub until ticket 07).
- Error handling per **Talking to the API**: a form alert showing `title` + `detail`.

## Acceptance criteria

- [ ] E2e covers: unregistered → redeem → create Household → home; the invitation link prefill; the invalid-code problem. axe passes on every state.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 3–6; First run; Screens and routes.
