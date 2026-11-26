# 04: Add a cash Account, and its Account area

Status: needs-triage
Blocked by: 02
Waits on backend: no

## What to build

**Add Account**

- **The Cash kind:** a fifth kind card, **Cash**.
- **The Opening count fields:** choosing Cash reveals **Opening count** and **Opening count again**, sent as `opening_count` and `opening_count_confirmation`.
  - The form refuses two different counts with a field error on the second one.
  - The server's 422 `opening-count-mismatch` is the form alert.
- **Start date:** defaults to today for Cash. Switching the kind restores the 1st of the month, unless the member edited the date.

**A cash Account's area**

- **Tabs:** only **Transactions** and **Months**.
- **Removed:** no Import statement button, and no getting-started checklist.
- **The index route** goes to Transactions.
- **Statement-only routes** (to-review, statement-imports, connections) redirect to Transactions.

**The Accounts overview** shows "—" for a cash Account's To review count.

**The Record a Transaction button** comes in ticket 05.

## Acceptance criteria

- [ ] The Add Account dialog has the Cash card, the two count fields shown only for Cash, the in-form check, and the start-date default as described
- [ ] The cash Account area as described. Routes for a statement Account are unchanged
- [ ] The overview shows "—" for a cash Account's To review count
- [ ] Mock `POST …/accounts`:
  - accepts `CASH` with both counts, and refuses them for other kinds (`invalid-account`);
  - answers `opening-count-mismatch` for two different counts;
  - creates the Opening balance Transaction, with `awaiting_first_statement_import: false` and a balance;
  - `createConnection` on a cash Account is `invalid-connection`
- [ ] E2e: the counts differ, then agree; the member lands on Transactions with the balance; only two tabs; a typed to-review URL redirects; axe

## Spec

[spec.md](../spec.md): stories 1–4; "Cash Account screens".
