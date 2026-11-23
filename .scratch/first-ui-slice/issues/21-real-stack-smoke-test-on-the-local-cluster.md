# A real-stack smoke test on the local cluster

Status: done
Blocked by: 11, 20
Waits on backend: no. It uses wallet-accountant's `make local-up`, `make local-deploy`, `make local-bootstrap` and `deploy/local/zitadel.sh` as they are.

## What to build

The spec's "Later" item: a smoke test against the real stack, which signs in, imports a statement, and closes a month.

`make local-smoke` starts from nothing, as wallet-accountant's does:

1. It refuses to start if the cluster exists, rather than delete it.
2. It runs `make local-up`, then `make local-deploy`, in the backend's checkout (`WA_REPO`), then this repo's `make local-deploy`.
3. It creates a Zitadel human user with a random password (`zitadel_human_user`), and gets a bootstrap Invitation code (`make local-bootstrap`). The code goes into the test's environment only, never into a log.
4. Playwright, in its official image on the k3d network, drives `https://wallet.localhost:18443`. Inside the container, the ingress is forwarded so the browser keeps the real origins, and the browser trusts only certificates checked against the mkcert CA, as the backend's `tls-pin.js` does.
5. It runs `make local-down`, whatever happened. `SMOKE_KEEP=1` keeps the cluster. On failure, the traces go to a git-ignored results folder.

The browser test does everything through the UI, with nothing seeded through the API:

- Sign in through Zitadel, redeem the bootstrap code, and create a Household.
- Add a bank Account starting on the 1st of last month, whatever today's date is.
- Create a Connection with a CSV mapping in the editor (ticket 11).
- Import a statement whose rows all fall in last month. The Opening balance preview and the result say what the file implies.
- Accept every row in To review with a Category, creating one first if the Household has none to pick.
- Close last month with the Export balance as its Statement balance, then check that the open month moved on.

## Acceptance criteria

- [x] `make local-smoke` passes from no cluster, and leaves none behind unless `SMOKE_KEEP=1`.
- [x] It passes on any day of the month, because no step depends on today's date beyond "last month".
- [x] A failing step leaves a trace and a screenshot in the results folder.
- [x] `docs/architecture/conventions.md` lists the target and what it needs: Docker, k3d, kubectl, flux, mkcert, curl, jq, and the backend's checkout.

## Spec

[spec.md](../spec.md): "Later"; [ticket 20](20-sign-in-against-the-local-cluster-and-local-deploy.md) for the sign-in check this grows from.

## Notes

- From ticket 20: the throwaway check, kept outside the repo, already signs in, redeems a bootstrap code, creates a Household, checks `/api/me`, round-trips a deep link and shows the session-ended dialog. It used `ignoreHTTPSErrors`; this ticket pins certificates instead.
- The API can't issue Invitations, and a bootstrap code works only before an Instance administrator exists. So the test has to start from a fresh cluster (decided 2026-11-23).
- From ticket 11: the editor's controls are named for the test. "Open a sample file" is the file input. The guesses fill Encoding, Delimiter, "The first line names the columns", Date format and Decimal separator. Each sample column has a "What column N holds" menu button (Booking date, Description, Amount, …). "Read the sample" asks the real backend, then Save. The real backend reads quoted CSV (Go's `encoding/csv`), which the mock doesn't, so a smoke file with quotes would behave differently in mock mode.
- Running it in CI is out of scope here. The backend's `smoke.yaml` shows the shape: about 10 minutes, and the private environment repo through a deploy key.

## Comments

- 2026-11-23: Built. `make local-smoke` runs `smoke/smoke.sh`, which follows the backend's `deploy/local/smoke.sh`. The browser test is `smoke/smoke.spec.ts`, with its own `smoke/playwright.config.ts`. `smoke/tls-pin.ts` and `smoke/global-setup.ts` are TypeScript ports of the stand-in UI's `tls-pin.js` and its ingress forwarding.
- **Build records**: both repos record the smoke builds in `bin/local-smoke-build.env`, so neither developer's `bin/local-build.env` is touched. The backend's `local-deploy` runs with `LOCAL_UI_BUILD=` empty, so a developer's UI build is never staged. This repo's `local-deploy` gets `LOCAL_BUILD` on the command line, and make passes it on to the backend's `local-push`, so it stages the backend build made just before.
- **Secrets**: the code and the password reach the container by name only (`-e NAME`), so they appear in no command line. A failed run's trace in `bin/smoke-results/` holds what was typed, these included. It stays on the machine, and the cluster goes when the run ends.
- **Dates**: the browser runs in en-US and UTC, and the test computes every date in UTC from "last month". Rows fall on the 2nd, 10th and 20th, the Account starts on the 1st, and the Export balance 3,000.00 implies an Opening balance of 526.90.
- **Categories**: a new Household has only Internal Categories, so the test always creates Groceries (Expense) and Salary (Income) first.
- **Run**: the first run failed on an ambiguous locator, because the sidebar repeats an Account's state. That run confirmed the trace and screenshot land in `bin/smoke-results/` and that the cluster is deleted. With the text assertions scoped to the main landmark, the second run passed from no cluster in 686 s: about 11 minutes, 16 s of it the browser test. No cluster was left.
