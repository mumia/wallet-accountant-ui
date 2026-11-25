# 04: Invite someone, list and revoke open Invitations

Status: done
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

- [x] The list, and its empty state
- [x] The Invite dialog's two steps. The link is built by a small tested function. Copy uses `navigator.clipboard.writeText` and announces "Copied" politely. If the clipboard is missing, it selects the field's text instead
- [x] Closing step 2 invalidates the list. The code never appears in the list
- [x] Revoke confirms, then invalidates the list. A 404 closes the dialog, shows a toast with the problem and refetches
- [x] Mock: in-memory Invitations per Household with a random code, `expires_at` 24 hours after issue, `issued_by` the caller. An Idempotency-Key replay returns the same code. Revoke answers 404 for an Invitation that isn't open. Joining (ticket 05) marks an Invitation redeemed
- [x] Unit: the link builder
- [x] E2e: issue, then copy (Playwright clipboard permission), then close, then see it listed without its code; revoke; revoke a row that's gone (toast); empty state. axe on every state, including both dialog steps

## Spec

[spec.md](../spec.md): stories 1–5; "Members screen"; "Invite dialog"; "Revoke, Remove and Leave".

## Comments

Built as specified, with these choices and deviations:

- **Where it lives:** `features/members/open-invitations.tsx` is the section, rendered under the members table by one line in `members-page.tsx`. The Invite dialog (`invite-dialog.tsx`, with `CopyField`) and the Revoke dialog (`revoke-invitation-dialog.tsx`) are their own files, so ticket 06's Remove and Leave touch little of the same code.
- **Loading:** the section reads `GET …/invitations` with `useQuery`, not in the route's loader, so the members table never waits for it. While it loads it shows a skeleton; a failure is an alert with "Try again" inside the section, and the rest of the screen stays.
- **AlertDialog:** shadcn's `alert-dialog` was added with `make ui-add` (`components/ui/alert-dialog.tsx`, unchanged from upstream). Ticket 06 needs the same part.
- **Revoke… buttons** carry a visually hidden suffix, "the Invitation issued by {issuer} on {date}", so each row's button has its own accessible name that starts with the visible text.
- **Invite dialog:** step 2 keeps the title "Invite someone to {Household}" and uses the warning line as its description. Its footer button is **Done** (the dialog's × is already named "Close"). Closing invalidates the list, as specified, and a successful issue invalidates it too, in case the dialog was closed while the request was in flight. The dialog returns to step 1 once its close animation ends.
- **"Copied"** is a polite `role="status"` line under the fields, emptied and refilled on each copy so a second copy is announced again. A clipboard that refuses (`writeText` rejects) falls back to selecting the text, like a missing one.
- **Strings:** `members.invitations.*`.
- **The mock** (`mocks/invitation-handlers.ts`; `MockState.invitations`): Invitations per Household with a random 32-byte base64url code, `expires_at` 24 hours after issue and `issued_by` the mock User. A replay with the same Idempotency-Key returns the same Invitation. The list leaves out redeemed, revoked and expired ones and never carries a code. Revoking one that isn't open is 404 (the mock's usual `Not Found` problem). Joining with an issued code (`/memberships`, `/registrations`) marks it redeemed. `?mock-invitation=Ana` / `?mock-invitation=` / `?mock-invitation=me` seed an open Invitation issued by Ana, a nameless member, or the User (documented in `docs/architecture/conventions.md`).
- **Tests:** `lib/invitation-link.test.ts` (the link builder), `features/members/invite-dialog.test.tsx` (copying, and the select fallback with no clipboard or a refusing one), `mocks/invitation-handlers.test.ts` (issue, replay, names, revoke, expiry, redemption, 404), and `e2e/invitations.spec.ts` (empty state, the list's issuers, issue → copy both → close → listed without its code, a failed issue then a retry, Revoke with Cancel, Revoke of a row already gone with its toast). axe runs on every state, both dialog steps included. The "row that's gone" is made by revoking it with `fetch` from the page, as another member would.
- **`make check`:** lint, typecheck, 472 unit tests, build, audit, contract check and the image pass. (A first run had two unrelated unit tests time out at 5 s while other agents loaded the machine; the rerun passed.) E2e: 110 of 110 passed. Two earlier runs, while parallel agents' builds kept the load average near 20, had 14 and 24 failures that were all 30 s timeouts or Playwright protocol errors spread across unrelated specs.
