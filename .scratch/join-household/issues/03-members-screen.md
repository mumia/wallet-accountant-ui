# 03: The Members screen

Status: ready-for-agent
Blocked by: 02
Waits on backend: no for the mocks. The real API answers `listMembers` once a release carries the backend's join-household ticket 08.

## What to build

A new route `…/members`, reached from **Members** in the sidebar, below Categories. It shows a table of the Household's members from `GET …/members`, oldest first as served:

- **Name:** the display name, or "No name yet" in muted text;
- **Joined:** a locale date.

Your own row says "(you)", found by comparing `user_id` with `GET /me` from ticket 02. If you have no name, it also has a **Set your name** link that opens ticket 02's dialog.

Leave space for later tickets: ticket 04 adds the open Invitations section under the table, and ticket 06 adds Remove and Leave.

## Acceptance criteria

- [ ] Route, sidebar link (users icon, active state like the other links) and screen heading "Members"
- [ ] The members table, with "(you)", "No name yet" and **Set your name**
- [ ] The usual loading and failed-load ("Try again") states. A 404 goes to the Household route's not-found screen
- [ ] Mock: in-memory members per Household, with the mock User as the creator. A `mock-…` parameter seeds a second member
- [ ] E2e: one member, two members, a member with no name. axe on each

## Spec

[spec.md](../spec.md): story 15; "Screens and routes"; "Members screen".
