# 04: Invite someone, list and revoke open Invitations

Status: ready-for-agent
Blocked by: 03
Waits on backend: no for the mocks. The real API answers once a release carries the backend's join-household tickets 04 and 05.

## What to build

The **Open Invitations** section of the Members screen, with three parts:

- **The list:** from `GET …/invitations`, with the columns Issued by ("you" for your own), Issued and Expires (date and time). With nothing open it shows the empty-state text from the spec.
- **Invite someone:** a two-step dialog.
  1. Confirm and **Create Invitation**: `POST …/invitations` through the write wrapper, with an Idempotency-Key.
  2. The **Invitation link** `{origin}/join?invitation_code={code}` and the bare **Code**, each with a copy button, and the "works once, expires {time}, won't be shown again" line.
- **Revoke…:** an AlertDialog per row, then `DELETE …/invitations/{id}`.

## Acceptance criteria

- [ ] The list, and its empty state
- [ ] The Invite dialog's two steps. The link is built by a small tested function. Copy uses `navigator.clipboard.writeText` and announces "Copied" politely. If the clipboard is missing, it selects the field's text instead
- [ ] Closing step 2 invalidates the list. The code never appears in the list
- [ ] Revoke confirms, then invalidates the list. A 404 closes the dialog, shows a toast with the problem and refetches
- [ ] Mock: in-memory Invitations per Household with a random code, `expires_at` 24 hours after issue, `issued_by` the caller. An Idempotency-Key replay returns the same code. Revoke answers 404 for an Invitation that isn't open. Joining (ticket 05) marks an Invitation redeemed
- [ ] Unit: the link builder
- [ ] E2e: issue, then copy (Playwright clipboard permission), then close, then see it listed without its code; revoke; revoke a row that's gone (toast); empty state. axe on every state, including both dialog steps

## Spec

[spec.md](../spec.md): stories 1–5; "Members screen"; "Invite dialog"; "Revoke, Remove and Leave".
