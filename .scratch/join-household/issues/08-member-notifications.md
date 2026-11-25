# 08: Member Notifications in the bell

Status: done
Blocked by: 03
Waits on backend: no for the mocks. The real API raises them once a release carries the backend's join-household ticket 10.

## What to build

The bell (`src/features/shell/notifications-bell.tsx`) learns `MEMBER_JOINED`, `MEMBER_LEFT` and `MEMBER_REMOVED`:

- **Text:** "{member} joined the Household", "{member} left the Household", "{removed_by} removed {member}".
- **Names:** "You" for the caller's own `user_id` (from ticket 02's `GET /me`), and "A member" for a UserRef without a `display_name`.
- **Clicking** marks the Notification read and opens `…/members`.
- **Fallback:** a member kind without `member` falls back to the unknown-kind display, the same way `SUSPECTED_DUPLICATES_FOUND` without `account_id` already does.

## Acceptance criteria

- [x] `notificationKinds` knows the three kinds, and the message files have the strings, with interpolation and "You" variants
- [x] Clicking marks the Notification read and navigates to `…/members`
- [x] Unit (`notifications-bell.test.ts`): each kind; "You" as member and as remover; a missing name; a missing `member`
- [x] Mock: the seeded Notifications include one of each member kind
- [x] E2e: each kind's text, and clicking one opens Members and clears the unread badge. axe on the open panel

## Spec

[spec.md](../spec.md): stories 20–21; "Notifications".

## Comments

Built as specified, with these choices:

- **The text** comes from `memberNotificationText(notification, myUserId, t)` in `notifications-bell.tsx`, a pure function so `notifications-bell.test.ts` checks the real English strings. It returns undefined for any other kind and for a member kind without `member`, which then falls back to the unknown-kind display (the raw `kind`, no link).
- **Names as the object of "removed"** are lower case: "Rui removed you", "Rui removed a member". The spec gives "Rui removed you"; "a member" follows the same rule. The strings are `shell.notifications.names.{you,youObject,aMember,aMemberObject}`.
- **A `MEMBER_REMOVED` without `removed_by`** reads "A member removed Ana", treating it like a remover without a name. The spec doesn't say.
- **Until `GET /me` answers**, no one reads "You": the caller's own name is shown, as on the Members screen.
- **The mock:** Home's seeded Notifications gain three, newest: "You removed Ana" (unread), "A member left the Household" (unread, a member with no name) and "Ana joined the Household" (read). Home's unread count goes from 2 to 4, and `e2e/notifications.spec.ts` was updated for it.
- **"Clears the unread badge"** is tested as the bell's count dropping by one and the item losing its "Unread:" mark, also after a reload. The bell can't reach zero in the default scenario, because the seeded unknown kind can't be followed.
- **`make check`:** lint, typecheck, 464 unit tests, build, audit, contract check, the image and all 105 e2e tests pass.
