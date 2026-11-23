# Overview counts, the open month and month options

Status: done
Blocked by: 07, 10, 13
Waits on backend: yes. Needs `pending`, `suspected_duplicates` and `open_month` on Account, and the months list.

## What to build

Finish the parts earlier tickets left behind a seam:

- The To review count in the sidebar and overview, and "Open month: …" linking to that month.
- The Transactions tab opening on the open month, with its month field offering every month.
- The To review month field offering only months with rows To review.

## Acceptance criteria

- [x] No seam from tickets 10 or 13 remains. The e2e tests from those tickets are updated.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 11; Screens and routes (Accounts overview); Transactions and To review (month fields).

## Notes

- From ticket 10: The seam is `src/lib/account-months.ts` (`defaultBookingMonth`, `accountMonths`); replace both bodies. The Transactions empty month state should also offer "Go to To review" when the month has rows To review (needs the counts); it doesn't yet.
- From ticket 13: To review uses the same seam for its month field and default month (`features/to-review/to-review-tab.tsx`). Its month field should offer only months with `pending + suspected_duplicates` above zero.
- From ticket 15: The contract is pinned to v0.2.0 since ticket 15. Accounts now carry `open_month`, `pending` and `suspected_duplicates` (the mock computes the counts at read time, `withCounts`), and `useMonths` (`features/months/months-query.ts`) reads the months list. The seam in `lib/account-months.ts` can now be swapped. To review already locks rows by `account.open_month`.
- From ticket 16: The Transactions table takes `openMonth` already. When the seam defaults to the open month, the first test in `e2e/transactions.spec.ts` ("Until the backend serves the open month, no month means all months") needs to change. Main's ledger now has Uncategorised rows only in November.

## Answer

Landed on 2026-11-23.

- **The seam is gone**: `lib/account-months.ts` is now plain helpers over the Account and its months list: `defaultBookingMonth(account)` (the open month), `transactionMonths` (every month), `toReviewMonths` (only months with `pending + suspected_duplicates` above zero, plus the chosen month so the field can still show one carried over from Transactions), `toReviewCount` and `toReviewCountIn`. The Transactions and To review routes load `GET …/months` in their loaders.
- **Month field arrows** step to the nearest offered month (`nearestOffered` in `lib/month.ts`), so on To review they skip months with nothing to review. `monthsBetween` is gone, now unused.
- **Transactions** opens on the open month. The empty month state adds "Go to To review" (to that month) when the months list counts rows To review there.
- **To review** still defaults to all months, not the open month: the spec gives the open-month default to Transactions only, and rows To review can wait in months not open yet (Savings' November in the mock).
- **Accounts overview**: new columns **To review** (the count, linking to the To review tab and named "7 rows To review in Main"; a muted 0 otherwise) and **Month** ("Open month: November 2026" linking to that month's screen, or "Awaiting first Statement import"). The Balance cell of an awaiting Account is a dash, so the awaiting text isn't repeated (screen readers still hear it).
- **Sidebar**: a count badge after the balance when the Account has rows To review; the link reads "Main €1,234.50 7 rows To review".
- **Freshness**: a Statement import now refetches the months list too (its counts, and any months it adds).
- **Tests**: `account-months.test.ts` and a `nearestOffered` test; e2e updated in `transactions.spec.ts` (opens on November with every month offered; the all-months test now goes to `booking_month=all`; Savings' empty November offers To review), `to-review.spec.ts` (Savings' field offers only November and October, arrows skip, a carried-over August still shows) and `shell.spec.ts` (overview columns, links, sidebar name).
- **Backend**: wallet-accountant main (c73718b) serves `open_month`, the counts on Account, and the months list.
- **`make check`** passes: lint, typecheck, 385 unit tests, build, audit, contract check, 76 e2e tests and the image.

