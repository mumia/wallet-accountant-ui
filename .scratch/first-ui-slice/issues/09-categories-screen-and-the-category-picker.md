# Categories screen and the Category picker

Status: done
Blocked by: 07
Waits on backend: none

## What to build

- The **Category picker** shared component: a Base UI Combobox where every Category is an indented option searchable by full path ("Food › Groceries"), grouped as Uncategorised, then Expense, then Income. Parents can be picked and other Internal Categories are hidden. Options control which groups appear and which Categories are excluded (needed for Move and for closed months). Includes component tests by keyboard and role, and the Base UI bug workarounds named in the spec.
- `…/categories`: Expense, Income and Internal sections as indented trees. Internal is muted and locked. Create, Add sub-Category, Rename and Move use small dialogs; Move uses the picker. A 409 `category-name-taken` shows on the Name field.

## Acceptance criteria

- [x] The picker's component tests cover search by path, picking a parent, and keyboard-only use.
- [x] E2e covers create, rename and move, plus the duplicate-name error. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 14; Accessibility (Category picker); Categories, Add Account and the Transaction list (Categories).

## Notes

- From ticket 07: `routes/households/$householdId/categories.tsx` and `features/categories/categories-page.tsx` are a stub the sidebar already links to; replace the page.

## Answer

Landed on 2026-11-21.

- **The Category picker** (`components/category-picker.tsx`): a Base UI Combobox over the Category tree.
  - **Groups**: Uncategorised first (unlabelled), then Expense, then Income. Other Internal Categories are never offered.
  - **Options**: each Category is indented by depth. Its accessible name is the full path ("Food › Groceries", with the ancestors visually hidden), and the input shows the path once picked.
  - **Search**: every word typed must appear somewhere in the path, ignoring case and accents. So "food gro" finds Food › Groceries, which a plain substring match on "Food › Groceries" wouldn't.
  - **Parents** can be picked.
  - **Props**: `kinds`, `includeUncategorised`, `exclude` (a Set of IDs), `topLevelLabel` (adds `topLevel`) and `label`.
  - **Uncategorised** is recognised as the Internal Category of that name (`lib/categories.ts`, `isUncategorised`). The contract has no flag for it, but Internal Categories are created with fixed names and can't be renamed.
- **Base UI #6275 reproduced and worked around**: with the list open, Base UI hides the page, label included, and the input lost its name. Comboboxes now take a `label` prop and are named with `aria-labelledby` (or `aria-label`). The currency combobox was changed the same way.
  - Of the other two bugs: **#5659** (Toast) waits for ticket 14's toasts. **#6284** (live regions left exposed under a modal Dialog) doesn't arise yet, since no live region exists outside a dialog.
- **Component tests** (`category-picker.test.tsx`, by role and keyboard):
  - the groups and their order, with Internal hidden;
  - the name kept while open;
  - search by path and picking by keyboard alone;
  - picking a parent;
  - kinds, exclusions and Top level for Move.
- **The Categories screen** (`features/categories/`): Expense, Income and Internal sections, each a nested list, all expanded at first. Parents have a show/hide button (`aria-expanded`).
  - Internal is muted with a lock and the spec's note, and has no actions.
  - **New Category** sits in the Expense and Income headers, described by the section heading so the two buttons are told apart.
  - **Row menu**: Add sub-Category, Rename…, Move….
  - **Create and Rename** share a Name dialog (1–100 characters). Its description says where: "Under: Food › Eating out".
  - **409 `category-name-taken`** sets the Name field's error to the problem's detail and focuses it. Other refusals show the form alert.
  - **Move** uses the picker, limited to the Category's kind, without it and its sub-Categories, and with "Top level". It preselects the current place.
  - Nothing is optimistic; writes invalidate the tree.
- **Mock API**: a stateful Category tree per Household (Internal three for every Household, plus a small tree for Home), with create and change implementing the backend's rules and problems word for word.
- **e2e** (`e2e/categories.spec.ts`, 5 tests, axe on each state):
  - the sections and locking, plus collapse;
  - create root and sub;
  - the duplicate-name error;
  - rename;
  - move under a parent, with the move-into-itself exclusion, and to the top level.
- **`make check`** passes: lint, typecheck, 351 unit tests, build, audit, contract, 41 e2e tests and the image.
