# 11: Pick up the backend's Category direction rule

Status: done
Blocked by: 03
Waits on backend: no. v0.10.0 is released and carries `../wallet-accountant/.scratch/category-direction/`.

## What to build

The backend will refuse an Expense Category on money in, and an Income Category on money out, in three places:

- Accept;
- Set Category;
- `recordCashTransaction`.

When that's released:

1. Re-pin the contract to that tag.
2. Teach the mocks the new problem.
3. Check that the refusal reaches the member through the usual error path (form alert or toast). It should only happen in a race, or with an old tab, since ticket 03 already filters the pickers.

## Acceptance criteria

- [x] `make contract-update ref=v0.10.0`
- [x] The mocks refuse wrong-direction Categories with the backend's problem type
- [x] One e2e per place, forcing the request past the picker (for example with `fetch` from the page), to check that the problem shows
- [x] `make check` passes

## Spec

[spec.md](../spec.md): "The sign rule (every Account kind)".

## Comments

- 2026-11-27: built on `build/cash-accounts-11-backend-category-direction`, from main (06 is merged).
  - **The contract** is pinned to v0.10.0. It adds `/problems/category-direction`, a 422 that names `category_id`, `category_kind` (INCOME/EXPENSE) and `direction` (IN/OUT) on `TransferProblem`. Set Category's 422 is now `TransferRefused`.
  - **The mock** (`src/mocks/category-direction.ts`) uses the backend's wording from `direction.go` and `problem.go`. Accept, Set Category and recording a cash Transaction check it right after their Internal Category refusal, as the backend does. Set Category checks it in closed months too. A zero amount and Internal Categories pass.
  - **No UI change:** each place already shows a problem's own `title` and `detail`. The cash sheet shows it as a form alert with the input kept. Set Category rolls back and shows a toast naming the row. A single Accept shows a toast naming the row, and the row stays To review.
  - **The e2e** (`e2e/force-category.ts`) wraps the page's `fetch`. The next request with a `category_id` goes out with Salary (Income) instead, after a valid Expense pick on money out. That gets past the picker as an old tab would. There's one test in each of `record-cash`, `transactions` and `to-review`, each with axe.
- 2026-11-27: `make check` passed:
  - lint, typecheck, build, audit and the contract check;
  - unit tests: 552 passed (new: four in `src/mocks/transaction-handlers.test.ts`);
  - e2e: 136 passed;
  - the image test.
