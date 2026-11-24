# 01: Check the Export balance against the file's own balance

Status: resolved
Blocked by: —
Waits on backend: no. v0.7.0 adds the balance column and the file's balance check (`../wallet-accountant/.scratch/file-balance/issues/01-check-the-export-balance-against-the-file.md`).

## Why

A first import was given the wrong Export balance (€1,000.00 instead of €8,758.21), so the Opening balance came out wrong. Typing it twice and the preview didn't catch it. The file's own running balance (`Saldo`) said €8,758.21 on its newest row. The backend now checks the typed Export balance against the file's balance whenever the CSV mapping picks a balance column, and refuses a mismatch. The UI offers the column, shows the file's balance in the mapping test, asks for the Export balance once when the file checks it, and shows the new problem.

## What to build

- [x] Move `src/api/CONTRACT_VERSION` to the release with `make contract-update ref=<tag>`.

### CSV mapping editor

- [x] **Balance** becomes a column the User can pick, optional, in both amount layouts (`columnFields` and `columnsFor` in `src/lib/csv-mapping.ts`, the field label in the locale). It reads and writes `columns.balance`. It is never guessed.
- [x] **How rows will read** (`mapping-test.tsx`):
  - a Balance column when any row has `balance`;
  - under the summary line, "The file's balance: €8,758.21 (line 14)" from `file_balance`, or `file_balance_problem` as a warning.

### Statement import

- [x] **First import, through a Connection whose mapping has a balance column:** one Export balance field. No "Export balance, again", and no `export_balance_confirmation` sent. Without a balance column, nothing changes.
- [x] **The new problem** (export balance differs from the file) shows as the form alert. The Export balance input stays, as for other refused uploads. A file whose balance can't be worked out shows its problem the same way.
- [x] The page never shows the file's balance before the User types. The User reads the balance from the bank.

### Mock

- [x] `src/mocks/statement-files.ts` reads the balance column and works out the file's balance as the backend does (from both ends, by the balances; every readable row counts).
- [x] The mapping test returns `balance` per row and `file_balance` or `file_balance_problem`.
- [x] Preview and upload refuse a mismatch and a column that doesn't add up, with the backend's problems. The preview needs no confirmation with a balance column.
- [ ] Seed one Connection with a balance column, so the e2e tests have one. Not done: the e2e test makes one through the editor instead (see Comments).

### Tests

- [x] **Unit:**
  - `csv-mapping` reads and writes `columns.balance`;
  - the mock works out the file's balance for oldest-first, newest-first and one-row files, and a column that doesn't add up.
- [x] **e2e:**
  - the mapping editor shows the Balance column and the file's balance;
  - a first import through a mapping with a balance column asks once, and refuses €1,000.00 with the file's balance in the alert;
  - an import without a balance column still asks twice.

### Done when

- [x] `make check` passes against the new contract

## Comments

- 2026-11-24, implementation notes:
  - The backend released v0.7.0. Its problems are `/problems/export-balance-differs-from-file` (with `file_balance` and `line`) and `/problems/file-balance-unknown`. The mock words both as the backend does, amounts as "1000.00 EUR".
  - Both refusals have no Money fields, so the import page shows them as a plain refusal: the title, and the backend's detail naming the typed balance, the file's balance and its line.
  - No Connection is seeded with a balance column. The e2e test gives one to "Card statements" through the CSV mapping editor, then imports through it. That covers the editor and the import together, and leaves the other tests' seeds as they were.
  - Fixed on the way: the mapping test's gap row spanned one column too few (it counted 3 fixed columns, not 4).
