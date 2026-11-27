# 04: Add a cash Account, and its Account area

Status: done
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

- [x] The Add Account dialog has the Cash card, the two count fields shown only for Cash, the in-form check, and the start-date default as described
- [x] The cash Account area as described. Routes for a statement Account are unchanged
- [x] The overview shows "—" for a cash Account's To review count
- [x] Mock `POST …/accounts`:
  - accepts `CASH` with both counts, and refuses them for other kinds (`invalid-account`);
  - answers `opening-count-mismatch` for two different counts;
  - creates the Opening balance Transaction, with `awaiting_first_statement_import: false` and a balance;
  - `createConnection` on a cash Account is `invalid-connection`
- [x] E2e: the counts differ, then agree; the member lands on Transactions with the balance; only two tabs; a typed to-review URL redirects; axe

## Spec

[spec.md](../spec.md): stories 1–4; "Cash Account screens".

## Comments

- 2026-11-26: built on `build/cash-accounts-04-add-a-cash-account`, from main (it needs only 02).
  - **Add Account:** the Cash card is the fifth kind. Choosing it reveals **Opening count** and **Opening count again** (AmountInputs in the chosen currency). The form requires both, and puts "The two counts differ. Count again." on the second. A new currency clears both counts. Any server problem, `opening-count-mismatch` included, is the form alert, as before.
  - **Start date:** `defaultStartDate(kind)` gives today for Cash and the 1st of the month otherwise. Switching the kind applies it until the member edits the date.
  - **The dialog scrolls:** five kind cards and the two counts are taller than a small screen. The narrow-screen e2e now scrolls to the button.
  - **The Account area:** `isCash` (in `src/lib/account-query.ts`) hides Import statement and the To review, Statement imports and Connections tabs. The index route sends a cash Account to Transactions.
  - **Redirects:** `redirectCashAccount` runs in `beforeLoad` on to-review, statement-imports (index and new) and connections (index, new and edit). Each sends a cash Account to Transactions.
  - **The overview:** a cash Account's To review cell is "—", with screen-reader text "Nothing to review: a cash Account has no statements".
  - **Mock:** `POST …/accounts` takes `CASH` with both counts. It records the Opening balance Transaction on the start date, with `awaiting_first_statement_import: false` and a balance. It refuses with the backend's own wording: missing counts, a count in another currency or with too many places, and counts for another kind (`invalid-account`); two different counts (`opening-count-mismatch`). `createConnection` on a cash Account is `invalid-connection`.
  - **Tests:** unit tests for the mock (`src/mocks/account-handlers.test.ts`). E2e: the counts required, then different, then agreeing; landing on Transactions with €40.00 and the Opening balance row; only two tabs; the start date following the kind; every statement-only URL redirecting; the overview's "—". Each has axe.
  - **Not e2e:** the server's `opening-count-mismatch` as the form alert. The form's own check means the UI can't send two different counts, and MSW serves the API, so `page.route` can't fake one. It goes through the same `FormAlert` as every other Add Account problem.
- 2026-11-26: `make check` passed:
  - lint, typecheck, build, audit and the contract check against v0.9.0;
  - 503 unit tests;
  - 125 of 125 e2e;
  - the image test, with `min-api-version v0.9.0`.
