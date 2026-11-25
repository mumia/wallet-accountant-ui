# 08: Member Notifications in the bell

Status: ready-for-agent
Blocked by: 03
Waits on backend: no for the mocks. The real API raises them once a release carries the backend's join-household ticket 10.

## What to build

The bell (`src/features/shell/notifications-bell.tsx`) learns `MEMBER_JOINED`, `MEMBER_LEFT` and `MEMBER_REMOVED`:

- **Text:** "{member} joined the Household", "{member} left the Household", "{removed_by} removed {member}".
- **Names:** "You" for the caller's own `user_id` (from ticket 02's `GET /me`), and "A member" for a UserRef without a `display_name`.
- **Clicking** marks the Notification read and opens `…/members`.
- **Fallback:** a member kind without `member` falls back to the unknown-kind display, the same way `SUSPECTED_DUPLICATES_FOUND` without `account_id` already does.

## Acceptance criteria

- [ ] `notificationKinds` knows the three kinds, and the message files have the strings, with interpolation and "You" variants
- [ ] Clicking marks the Notification read and navigates to `…/members`
- [ ] Unit (`notifications-bell.test.ts`): each kind; "You" as member and as remover; a missing name; a missing `member`
- [ ] Mock: the seeded Notifications include one of each member kind
- [ ] E2e: each kind's text, and clicking one opens Members and clears the unread badge. axe on the open panel

## Spec

[spec.md](../spec.md): stories 20–21; "Notifications".
