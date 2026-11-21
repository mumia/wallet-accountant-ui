# Categories screen and the Category picker

Status: open
Blocked by: 07
Waits on backend: none

## What to build

- The **Category picker** shared component: a Base UI Combobox where every Category is an indented option searchable by full path ("Food › Groceries"), grouped as Uncategorised, then Expense, then Income. Parents can be picked and other Internal Categories are hidden. Options control which groups appear and which Categories are excluded (needed for Move and for closed months). Includes component tests by keyboard and role, and the Base UI bug workarounds named in the spec.
- `…/categories`: Expense, Income and Internal sections as indented trees. Internal is muted and locked. Create, Add sub-Category, Rename and Move use small dialogs; Move uses the picker. A 409 `category-name-taken` shows on the Name field.

## Acceptance criteria

- [ ] The picker's component tests cover search by path, picking a parent, and keyboard-only use.
- [ ] E2e covers create, rename and move, plus the duplicate-name error. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 14; Accessibility (Category picker); Categories, Add Account and the Transaction list (Categories).
