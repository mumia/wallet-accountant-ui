# Notifications bell

Status: open
Blocked by: 07, 13
Waits on backend: none

## What to build

- A bell in the sidebar with an unread count computed from the list, and a dropdown panel.
- Polling every 60 s while the page is visible, on focus, and after a Statement import.
- Clicking `SUSPECTED_DUPLICATES_FOUND` marks it read and opens To review with `state=SUSPECTED_DUPLICATE`. An unknown `kind` is shown as-is, with no link.

## Acceptance criteria

- [ ] E2e covers the badge count, following a Notification, and an unknown kind. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 44–45; Notifications; Talking to the API (Freshness).

## Notes

- From ticket 12: poll Notifications at about 3 s and 10 s after a Statement import. The hook is `useUpload`'s `onSuccess` in `features/statement-import/statement-import-query.ts`, which already refetches the other reads an import changes.
- From ticket 13: a `SUSPECTED_DUPLICATES_FOUND` Notification opens `…/to-review?state=SUSPECTED_DUPLICATE` (`toReviewSearch`). Accept, Keep and Discard should also refetch Notifications: add the key to `refetch` in `useDecide` (`features/to-review/to-review-query.ts`).
