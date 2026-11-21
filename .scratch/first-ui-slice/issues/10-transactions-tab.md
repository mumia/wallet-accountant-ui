# Transactions tab

Status: open
Blocked by: 08, 09
Waits on backend: partly. The open-month default needs `open_month` on Account, and the month field's options need the months list. Until they land, default to `booking_month=all` behind one clearly marked seam, and finish it in ticket 19.

## What to build

- The Transactions list: Booking date (Transaction date under it when different), Description, signed right-aligned Amount, and a Category picker that saves on pick (optimistic, rolled back with a toast).
- The month field with arrows. `booking_month=all` loads all months oldest first with infinite scroll and virtualisation ("Showing N so far"). A chosen month loads in full.
- The "Uncategorised only (N)" toggle chip (`uncategorised=true`), enabled for a single month only.
- The empty and filtered states from the spec.
- Reverse and the closed-month rules are ticket 16.

## Acceptance criteria

- [ ] E2e covers the month filter, changing a Category, a failed save rolling back, and the Uncategorised toggle. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 35, 36 (open months), 38; Categories, Add Account and the Transaction list (Transactions); Talking to the API (Long lists).

## Notes

- From ticket 08: `routes/households/$householdId/accounts/$accountId/transactions.tsx` is a stub with `validateSearch: bookingMonthSearch` (`lib/search.ts`); the Account area's tabs already carry `booking_month` between To review and Transactions.
- From ticket 09: The row picker is `components/category-picker.tsx`; give it `label={{ text: "Category for 12 Mar, Albert Heijn, −23.40 EUR" }}` (a row has no visible label). `lib/categories.ts` flattens the tree and knows Uncategorised.
