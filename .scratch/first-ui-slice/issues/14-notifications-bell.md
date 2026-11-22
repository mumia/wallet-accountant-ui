# Notifications bell

Status: done
Blocked by: 07, 13
Waits on backend: none

## What to build

- A bell in the sidebar with an unread count computed from the list, and a dropdown panel.
- Polling every 60 s while the page is visible, on focus, and after a Statement import.
- Clicking `SUSPECTED_DUPLICATES_FOUND` marks it read and opens To review with `state=SUSPECTED_DUPLICATE`. An unknown `kind` is shown as-is, with no link.

## Acceptance criteria

- [x] E2e covers the badge count, following a Notification, and an unknown kind. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 44–45; Notifications; Talking to the API (Freshness).

## Notes

- From ticket 12: poll Notifications at about 3 s and 10 s after a Statement import. The hook is `useUpload`'s `onSuccess` in `features/statement-import/statement-import-query.ts`, which already refetches the other reads an import changes.
- From ticket 13: a `SUSPECTED_DUPLICATES_FOUND` Notification opens `…/to-review?state=SUSPECTED_DUPLICATE` (`toReviewSearch`). Accept, Keep and Discard should also refetch Notifications: add the key to `refetch` in `useDecide` (`features/to-review/to-review-query.ts`).

## Answer

Landed on 2026-11-22.

- **The bell** (`features/shell/notifications-bell.tsx`) sits beside the Household switcher in the sidebar header.
  - **Its name** says the count: "Notifications, 2 unread", or "Notifications" when none is unread. The visible badge (capped at "99+") is hidden from screen readers, since the name already says it.
  - **The count** is worked out from the list in the browser.
- **The panel** is a Base UI Popover titled "Notifications", listing them newest first. Each shows a dot and a bold line when unread (plus "Unread:" for screen readers), and the date and time.
  - A `SUSPECTED_DUPLICATES_FOUND` one reads "1 Suspected duplicate to review in Main" (the Account name comes from the cached Accounts list). It is a button: it closes the panel and the mobile drawer, marks the Notification read if it isn't, and opens that Account's To review with `state=SUSPECTED_DUPLICATE`.
  - **Mark read** is optimistic. A failure rolls back and toasts "The Notification wasn't marked read" with the problem.
  - **An unknown `kind`** is shown as sent, as text with no link. `notificationKinds` is tested against the contract.
- **Freshness** (`lib/notifications.ts`):
  - **Polling**: every 60 s, paused while the page is hidden (TanStack's default), and refetched on focus.
  - **After an import**: `pollNotificationsSoon` rereads at 3 s and 10 s after a Statement import (`useUpload`'s `onSuccess`).
  - **After a decision**: Accept, Keep and Discard now refetch Notifications too (`useDecide`).
- **The mock**: Home has three Notifications (one unread Suspected duplicates, one unread unknown kind `BALANCE_CHECK_FAILED`, one read). An import with Suspected duplicates raises a new one at once (the backend raises it a little later). List and mark read are served by `mocks/imported-transaction-handlers.ts`.
- **Tests**:
  - **Unit**: the known kinds against the contract, and the 3 s and 10 s rereads (fake timers).
  - **e2e** (`e2e/notifications.spec.ts`, axe with the panel open):
    - the badge count and the panel;
    - following a Notification to To review, read after a reload;
    - the unknown kind shown with no link;
    - an import with a Suspected duplicate reaching the bell within seconds.
- **`make check`** passes: lint, typecheck, 378 unit tests, build, audit, contract, 58 e2e tests and the image.
