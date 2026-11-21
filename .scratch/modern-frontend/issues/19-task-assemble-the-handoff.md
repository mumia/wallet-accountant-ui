# Task: assemble the handoff

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: task
Status: resolved
Blocked by: 11, 12, 13, 14, 15, 16, 17, 18

## Question

Write the destination: the UI spec for the first slice, in the shape of the backend's `.scratch/statement-import-to-month-close/spec.md`, built from every resolved ticket on the map; the Backend changes list as a separate handoff to `wallet-accountant`; and the two ADRs in `docs/adr/` (Application stack, Exact money in the browser) per [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md). AFK; nothing new is decided here, and any gap found goes back on the map as a ticket.

The backend handoff also includes a **prompt for the `grilling` skill in `wallet-accountant`** (requested by the user on 2026-11-20). Collect every open item from the map's Backend changes section and the `## Backend changes` heading of each resolved ticket (leave out items already marked done), then write a self-contained prompt the user can paste into a backend session: what the UI needs and why, the constraints the UI already fixed (field names, shapes, problem types, defaults), what is left to the backend to decide, and a link to the deciding ticket for each item. Save it next to the spec and link it from the map.

## Answer

Done on 2026-11-21. Nothing new was decided; two gaps went back on the map.

- **UI spec**: [spec.md](../spec.md), in the shape of the backend's first-slice spec (Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes), every section linking the ticket that decided it. Status draft: two sections are marked **Open**.
- **ADRs**: [ADR-0001 The application stack](../../../docs/adr/0001-application-stack.md) and [ADR-0002 Exact money in the browser](../../../docs/adr/0002-exact-money-in-the-browser.md), in the backend's ADR style.
- **Backend handoff**: [backend-handoff.md](../backend-handoff.md), a self-contained `grilling` prompt for a `wallet-accountant` session, in five areas (month rules, overview reads, `imported_transaction_id` on `AccountTransaction`, Connections and the CSV mapping, the environment repo), each with the UI's fixed constraints, what is left to the backend, and the deciding ticket.

Checked against the backend on 2026-11-21 (`api/openapi.yaml`, `wallet-accountant-deploy`): only `GET /currencies` is done. `imported_transaction_id` exists on the Ledger `Transaction` but not on `AccountTransaction`; `unchecked_statement_imports` only on `MonthCloseProblem`; the deploy repo still has `ui.enabled: false` and no Vite redirect URIs. All other items are open.

Reconciled, not decided: the UI contract now has the chart mount an empty writable `/tmp`, which [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md) didn't expect; the spec follows the contract. The Notifications panel shows an unknown `kind` as-is, following the precedent for unknown CSV mapping values in [Grilling: the CSV mapping editor](15-grilling-the-csv-mapping-editor.md).

**Gaps, now tickets:**
- [Grilling: the Categories screen, Add Account and the Transactions tab](20-grilling-categories-add-account-and-transactions-tab.md): only their routes were ever decided.
- [Grilling: loose ends from the look-and-feel prototype](21-grilling-loose-ends-from-the-look-and-feel-prototype.md): fonts, adding shadcn parts from Docker, TanStack Table v8 vs v9, passed on by ticket 09 and never settled by ticket 10.

Each fills its **Open** marker in the spec on resolution.
