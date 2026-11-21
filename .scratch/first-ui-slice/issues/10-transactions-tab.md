# Transactions tab

Status: done
Blocked by: 08, 09
Waits on backend: partly. The open-month default needs `open_month` on Account, and the month field's options need the months list. Until they land, default to `booking_month=all` behind one clearly marked seam, and finish it in ticket 19.

## What to build

- The Transactions list: Booking date (Transaction date under it when different), Description, signed right-aligned Amount, and a Category picker that saves on pick (optimistic, rolled back with a toast).
- The month field with arrows. `booking_month=all` loads all months oldest first with infinite scroll and virtualisation ("Showing N so far"). A chosen month loads in full.
- The "Uncategorised only (N)" toggle chip (`uncategorised=true`), enabled for a single month only.
- The empty and filtered states from the spec.
- Reverse and the closed-month rules are ticket 16.

## Acceptance criteria

- [x] E2e covers the month filter, changing a Category, a failed save rolling back, and the Uncategorised toggle. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 35, 36 (open months), 38; Categories, Add Account and the Transaction list (Transactions); Talking to the API (Long lists).

## Notes

- From ticket 08: `routes/households/$householdId/accounts/$accountId/transactions.tsx` is a stub with `validateSearch: bookingMonthSearch` (`lib/search.ts`); the Account area's tabs already carry `booking_month` between To review and Transactions.
- From ticket 09: The row picker is `components/category-picker.tsx`; give it `label={{ text: "Category for 12 Mar, Albert Heijn, −23.40 EUR" }}` (a row has no visible label). `lib/categories.ts` flattens the tree and knows Uncategorised.

## Answer

Landed on 2026-11-21.

- **The list** (`features/transactions/transactions-table.tsx`) is TanStack Table 9.3.1.
  - **Columns**: Booking date (with "Transaction date: …" under it when different), Description ("Reversed" under a reversed one), the signed Amount (right-aligned, tabular digits), and Category.
  - **Fixed Categories**: the Opening balance and other Internal Categories except Uncategorised, reversals and reversed rows show their Category as text.
- **Changing a Category** (`transactions-query.ts`, `useChangeCategory`): the row's picker is named "Category for Mar 3, 2026, Bol.com, -€4.20".
  - **Optimistic**: it updates every cached Transactions read of the Account.
  - **On failure**: it rolls back and shows a toast, "The Category of Mar 3, 2026, Bol.com, -€4.20 wasn't changed", with the problem's text. A save retries twice first, by the write rules.
  - **Afterwards**: it invalidates the Account's Transactions reads.
- **Toasts** (`components/toaster.tsx`): Base UI Toast at the default priority, which avoids #5659. They stay until closed. The close button is `aria-hidden` until the toast region is focused, which F6 does (Base UI's design); the e2e test closes a toast that way.
- **The month field** (`components/month-field.tsx`, ready for To review): previous and next arrows and a Base UI Select of "All months" plus the months. The trigger is named "Month March 2026", so the shown month is in its name.
- **One marked seam** (`lib/account-months.ts`): with no `booking_month` the tab shows all months, and the field offers every month since the Account's start date. Ticket 19 swaps both for `open_month` and the months list.
- **Loading** (spec, "Long lists"):
  - **A chosen month** loads every page (limit 200) into one query.
  - **All months** is an infinite query (oldest first). It renders through TanStack Virtual's window virtualizer inside the real `<table>`, with hidden spacer rows. The next page loads when the last 20 rows come near the viewport. A status reads "Showing 200 Transactions so far", then "267 Transactions".
  - **Failures**: a failed load shows the problem with "Try again".
- **"Uncategorised only (6)"**: a toggle chip (`aria-pressed`, `uncategorised=true`), counted from the loaded month. On all months it's disabled and described by the visible "Choose a month first". A row given a Category under the filter stays until the filter or month changes, or the page reloads.
- **Empty states**:
  - "No Transactions in November 2026" with "Show all months";
  - "Everything in March 2026 has a Category ✓" with "Show all Transactions";
  - "No Transactions yet." for all months.
  - **Not yet**: "Go to To review" on the empty month needs the To review counts, so it waits for ticket 19.
- **Supporting changes**:
  - `api/unwrap.ts` throws an openapi-fetch error as the problem itself, as the hooks do.
  - `errorText(error, t)` is usable outside components.
  - `?mock-fail=PATCH:3` fails writes by method.
  - The mock serves Main's 267 Transactions (paged by cursor) and the change, with the backend's rules.
- **e2e** (`e2e/transactions.spec.ts`, 5 tests, axe on each state):
  - all months paging with virtualisation, then a chosen month in full, the arrows, and the Transaction date;
  - changing a Category, kept after a reload;
  - a failed save rolling back with the toast;
  - the Uncategorised toggle, keeping rows, and the all-categorised state;
  - the empty states.
- **`make check`** passes: lint, typecheck, 356 unit tests, build, audit, contract, 46 e2e tests and the image.
