# Add Account and the Account area

Status: open
Blocked by: 07
Waits on backend: none

## What to build

- The **Add Account** dialog: Name; Kind as radio cards with Bank account preselected and Cash never offered; Account currency preselected to the Base currency; Start date with a calendar popover, defaulting to the 1st of this month and capped at today; all the help texts from the spec. Success goes to the getting-started state.
- The Account area: a header with "Import statement" and the tabs To review, Transactions, Months, Statement imports and Connections (defaulting to Transactions). Each tab is a stub until its own ticket.
- The getting-started state at `…/accounts/:accountId` while the Account awaits its first Statement import: step 1 Create a Connection, step 2 Import the first statement (disabled until step 1 is done). Otherwise redirect to `transactions`.

## Acceptance criteria

- [ ] E2e: add an Account and land on its checklist. The dialog is keyboard-operable and passes axe.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 15, 17; First run (Getting-started); Categories, Add Account and the Transaction list (Add Account); Screens and routes (Account area).
