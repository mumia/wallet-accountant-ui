# 11: Pick up the backend's Category direction rule

Status: needs-triage
Blocked by: 03
Waits on backend: a release that carries `../wallet-accountant/.scratch/category-direction/`.

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

- [ ] `make contract-update ref=<tag>`
- [ ] The mocks refuse wrong-direction Categories with the backend's problem type
- [ ] One e2e per place, forcing the request past the picker (for example with `fetch` from the page), to check that the problem shows
- [ ] `make check` passes

## Spec

[spec.md](../spec.md): "The sign rule (every Account kind)".
