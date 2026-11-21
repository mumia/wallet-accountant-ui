# Build: the first UI slice

The spec for this effort is [../modern-frontend/spec.md](../modern-frontend/spec.md) (final). This file doesn't restate it. It only gives the build order and shows which tickets wait on the backend.

## Rules for every ticket

- Read the spec sections a ticket names, and the decision ticket a section links when you need the reasoning.
- Follow `docs/architecture/conventions.md` once ticket 01 has written it.
- A ticket is done when `make check` passes, its e2e tests (with axe) pass, and its acceptance criteria are ticked. Set `Status: done` and add a short `## Answer` saying what landed.
- **Waits on backend** means the ticket needs a contract change from [backend-handoff.md](../modern-frontend/backend-handoff.md). Don't mock fields the pinned contract lacks: openapi-msw would reject them anyway. Start the ticket once a backend release tag carries the change, and re-pin the contract (ticket 03's `contract` job) as its first step.
- Where a ready ticket depends on a backend field, it builds behind one clearly marked seam. Ticket 19 removes the seams.

## Order

| # | Ticket | Blocked by | Backend |
|---|---|---|---|
| 01 | [Repo tooling and the Make loop](issues/01-repo-tooling-and-the-make-loop.md) | | ready |
| 02 | [Caddy image and CI](issues/02-caddy-image-and-ci.md) | 01 | ready |
| 03 | [Typed API client with exact money](issues/03-typed-api-client-with-exact-money.md) | 01 | ready |
| 04 | [Config, sign-in and the dev proxy](issues/04-config-sign-in-and-the-dev-proxy.md) | 03 | ready (local sign-in needs the environment-repo values) |
| 05 | [Theme system and the e2e harness](issues/05-theme-system-and-the-e2e-harness.md) | 01 | ready |
| 06 | [First run: register and create a Household](issues/06-first-run-register-and-create-household.md) | 04, 05 | ready |
| 07 | [Shell, Households and the Accounts overview](issues/07-shell-households-and-accounts-overview.md) | 06 | ready |
| 08 | [Add Account and the Account area](issues/08-add-account-and-the-account-area.md) | 07 | ready |
| 09 | [Categories screen and the Category picker](issues/09-categories-screen-and-the-category-picker.md) | 07 | ready |
| 10 | [Transactions tab](issues/10-transactions-tab.md) | 08, 09 | partly (seam) |
| 11 | [Connections and the CSV mapping editor](issues/11-connections-and-the-csv-mapping-editor.md) | 08 | ⚠️ waits |
| 12 | [Statement import flow](issues/12-statement-import-flow.md) | 08 | mostly ready (seam) |
| 13 | [To review list](issues/13-to-review-list.md) | 09, 12 | partly (seam) |
| 14 | [Notifications bell](issues/14-notifications-bell.md) | 07, 13 | ready |
| 15 | [Months, Month close and Reopen](issues/15-months-month-close-and-reopen.md) | 08, 10, 13 | ⚠️ waits |
| 16 | [Reverse and closed-month rules on Transactions](issues/16-reverse-and-closed-month-rules-on-transactions.md) | 10, 15 | ⚠️ waits |
| 17 | [Statement imports tab and Void](issues/17-statement-imports-tab-and-void.md) | 08, 12 | ⚠️ waits |
| 18 | [Rename an Account](issues/18-rename-account.md) | 08 | ⚠️ waits |
| 19 | [Overview counts, the open month and month options](issues/19-overview-counts-open-month-and-month-options.md) | 07, 10, 13 | ⚠️ waits |
| 20 | [Sign in against the local cluster, and make local-deploy](issues/20-sign-in-against-the-local-cluster-and-local-deploy.md) | 04 | ⚠️ waits (environment repo) |

02, 03 and 05 can run in parallel after 01. 08 and 09 can run in parallel after 07.

## Later

- A real-stack smoke test on the local k3d cluster (sign in, import a statement, close a month), to be specified when the build reaches it.
