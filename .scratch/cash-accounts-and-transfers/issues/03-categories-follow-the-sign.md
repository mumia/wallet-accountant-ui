# 03: Categories follow the amount's sign

Status: needs-triage
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

- [ ] `CategoryPicker` takes a sign input (out, in, or none), and filters its Expense and Income groups by it
- [ ] Set Category and the per-row To review picker pass the row's sign
- [ ] Bulk "Accept as" passes the selection's single sign, or narrows to Uncategorised with the hint when the selection is mixed. A chosen bulk Category that stops fitting when the selection changes is reset to Uncategorised
- [ ] A row whose current Category breaks the rule still shows it
- [ ] Unit: the groups for out, in, none, and a mixed selection
- [ ] E2e: To review (single, bulk all-out, bulk mixed) and Set Category, with axe

## Spec

[spec.md](../spec.md): stories 13–14; "The sign rule (every Account kind)".
