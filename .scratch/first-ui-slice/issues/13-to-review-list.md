# To review list

Status: open
Blocked by: 09, 12
Waits on backend: partly. The month field's options need the months list, and locking rows in months not open yet needs the month rules. Both are finished in ticket 19 and ticket 15 respectively.

## What to build

- The Suspected duplicates section above the Pending section, with the "Resembles" box. A per-row Category picker starting on Uncategorised.
- Accept, Keep and Discard: optimistic, a confirmation dialog for Discard, the 409 "Already Accepted" handling.
- Bulk selection with row-labelled checkboxes, a mixed-state header checkbox, Shift+click ranges and a polite announcement. The bulk bar sends one request per row, about 4 at a time, and reports "18 Accepted, 2 failed".
- `booking_month` and `state=SUSPECTED_DUPLICATE` in the URL, and the empty states.

## Acceptance criteria

- [ ] Component tests cover bulk selection by keyboard and role.
- [ ] E2e covers Accept with a Category, Keep, a confirmed Discard, bulk with partial failure, and the state filter. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 29–33; To review; Accessibility (Bulk selection).

## Notes

- From ticket 08: `…/accounts/$accountId/to-review.tsx` is a stub with `validateSearch: bookingMonthSearch`.
