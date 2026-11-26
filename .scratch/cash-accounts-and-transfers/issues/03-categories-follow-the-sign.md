# 03: Categories follow the amount's sign

Status: in-review
Blocked by: 02
Waits on backend: no. The backend's enforcement is ticket 11.

## What to build

Every Category picker, on every kind of Account, offers:

- **Expense Categories** only for money out (a negative amount);
- **Income Categories** only for money in (a positive amount);
- **Uncategorised** both ways, where it's already offered.

`CategoryPicker` takes the amount's sign as an input, and does no filtering when given none.

**Where it applies:**

- **Transactions → Set Category:** filtered by the row's sign.
- **To review → the per-row picker:** filtered by the row's sign.
- **To review → the bulk "Accept as" picker:**
  - when the selection is all one direction, it's filtered to fit;
  - when it mixes both, it offers only Uncategorised, with the hint "Select only money out, or only money in, to pick a Category".

**Rows that already break the rule** keep their Category as shown. The picker won't offer it again.

## Acceptance criteria

- [x] `CategoryPicker` takes a sign input (out, in, or none), and filters its Expense and Income groups by it
- [x] Set Category and the per-row To review picker pass the row's sign
- [x] Bulk "Accept as" passes the selection's single sign, or narrows to Uncategorised with the hint when the selection is mixed. A chosen bulk Category that stops fitting when the selection changes is reset to Uncategorised
- [x] A row whose current Category breaks the rule still shows it
- [x] Unit: the groups for out, in, none, and a mixed selection
- [x] E2e: To review (single, bulk all-out, bulk mixed) and Set Category, with axe

## Spec

[spec.md](../spec.md): stories 13–14; "The sign rule (every Account kind)".

## Comments

- 2026-11-26: built on `build/cash-accounts-03-categories-follow-the-sign`.
  - **The rule:** `src/lib/categories.ts` gained `signOf` (an amount's sign, none for zero), `commonSign` (a selection's one sign, or `mixed`) and `fitsSign` (Expense fits out, Income fits in, anything else both ways).
  - **The picker:** `CategoryPicker` takes `sign` (`out`, `in`, or none) and drops the Expense or Income group that doesn't fit. Its value is now looked up among every Category, not only the offered ones, so a row that breaks the rule still shows its Category.
  - **Callers:** Set Category and the per-row To review picker pass the row's sign. The bulk picker passes the selection's sign; a mixed selection offers no kind (only Uncategorised) and describes the picker with the hint. A chosen bulk Category that stops fitting is reset to Uncategorised, and stays reset if the selection changes back.
  - **Tests:** unit tests for the rule and for the picker's groups (out, in, none, mixed, and a rule-breaking value). E2e: To review single rows, bulk all-out then mixed then back, and Set Category, each with axe.
- 2026-11-26: `make check` passed:
  - lint, typecheck, build, audit and the contract check against v0.9.0;
  - 496 unit tests;
  - 121 of 121 e2e;
  - the image test, with `min-api-version v0.9.0`.
