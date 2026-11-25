# Spec: Joining a Household (UI)

Status: ready-for-agent (2026-11-25). The decisions listed under "Decided without a grilling" are open to correction.

The UI half of the backend's join-household spec (`../wallet-accountant/.scratch/join-household/spec.md`, ADR-0025). The backend lets any member invite someone into their Household, lets that person join whether or not they are already a User, and lets members see who belongs, revoke Invitations, remove each other or leave. This spec gives those operations screens. Domain terms come from `../wallet-accountant/CONTEXT-MAP.md` and the Households `CONTEXT.md`: **Household**, **Member**, **User**, **display name**, **Invitation**, **Notification**.

Ticket 01 has already moved the contract to v0.4.0 and handled its breaking changes: `/register` asks for a display name, and `Notification`'s Statement import fields are optional. The UI now pins **v0.7.0**, and the backend's `join-household` branch doesn't change `api/openapi.yaml` past it. **No ticket here needs a contract change or a backend change.**

## Problem Statement

A Household in the UI can only ever have the one member who created it. The backend can now issue Invitations to a Household, admit people through them, list members, and remove or let members leave, but the UI offers none of this. Someone who gets a code and is already a User has nowhere to redeem it: `/register` answers them with 409 and quietly sends them home. Members can't see who else can read their books, a User can't set or change their display name, and the three member Notification kinds show up in the bell as raw enum text.

## Solution

A **Members** screen in each Household's sidebar lists the members and the open Invitations. From there a member can:

- **Invite someone**: a dialog issues an Invitation and shows its link and code exactly once;
- **Revoke** an open Invitation;
- **Remove** another member;
- **Leave** the Household.

Every Invitation is handed over as one link, `/join?invitation_code=…`, which works for anyone:

- a User redeems it there with `createMembership`;
- someone Unregistered is sent on to `/register` with the code, where `createRegistration` makes them a User and a member in one step.

The User menu shows the caller's display name and has **Your name…** to change it, which also gives Users from before v0.4.0 a way to set one. The bell shows the member Notifications in words and links them to the Members screen. A member who loses access while the app is open sees a clear "no longer a member" screen instead of a generic not-found.

## User Stories

### Inviting

1. As a member, I want an **Invite someone** action on the Members screen, so that I can bring the person I share money with into the Household.
2. As a member, I want the new Invitation shown as a link I can copy, with the bare code beside it, so that I can send whichever suits the channel.
3. As a member, I want to be told plainly that the link works once, expires at a given time 24 hours away, and won't be shown again, so that I don't close the dialog before copying it.
4. As a member, I want to see the Household's open Invitations, who issued each and when it expires, so that I know which codes could still let someone in.
5. As a member, I want to revoke any open Invitation, after a confirmation, so that a link sent to the wrong person stops working.

### Joining

6. As someone Unregistered who opens an Invitation link, I want to land on `/register` with the code filled in, so that I only add my display name and press Redeem.
7. As a User who opens an Invitation link, I want a Join page with the code filled in and a **Join** button, so that I join the Household on purpose rather than by just following a link.
8. As a User who joined, I want to land in the Household I joined, which then appears in the Household switcher, so that I can start working in it at once.
9. As a User whose code is unknown, expired, revoked or used, I want the backend's message as the form alert, so that I know to ask for a new link.
10. As a User who opens a link to a Household I already belong to, I want to be told so and offered a way into my Households, so that I'm not left stuck. The code stays unused for the person it was meant for.
11. As a User who typed a Household code into `/register`, I want to be taken to the Join page with the code, so that I'm not sent home without joining.

### Display names

12. As a User, I want the User menu to show my display name, so that I see myself as other members see me.
13. As a User, I want **Your name…** in the User menu to change my display name, so that a name chosen in a hurry isn't permanent.
14. As a User who registered before display names existed, I want the User menu to invite me to set a name, so that I don't stay nameless to the other members.

### Members

15. As a member, I want to see every member with their display name and when they joined, oldest first, with my own row marked, so that I know who can see our money.
16. As a member, I want to remove another member, after a confirmation that says they lose access at once, so that someone who shouldn't see our books any more can't.
17. As a member, I want to leave the Household, after a confirmation, and land in another Household or on Create Household, so that I stop seeing books that aren't mine.
18. As the only member, I want Leave disabled with the reason, so that I don't try something the backend will refuse.
19. As a member who was removed while the app was open, I want my next screen to say I'm no longer a member of that Household and take me to my other Households, so that I understand what happened.

### Notifications

20. As a member, I want "Ana joined the Household", "Ana left the Household" and "Rui removed Ana" in the bell, so that membership changes are never silent.
21. As a member, I want clicking a member Notification to mark it read and open the Members screen, so that I can see the current members.

## Implementation Decisions

### Screens and routes

`…` is `/households/:householdId`.

| Route | Screen |
|---|---|
| `/join` | Join a Household (`?invitation_code=` prefills, without submitting). A first-run card without the sidebar, like `/register` |
| `…/members` | Members and open Invitations |

- **Sidebar:** **Members** (a users icon) goes below Categories, in its own group.
- **Sign-in round trip:** `/join?invitation_code=…` keeps its search through sign-in, as `/register` does. `session.ts` already returns to `pathname + search`.
- **Search validation:** `invitation_code` is validated like on `/register`: an optional string of at most 256 characters, ignored if invalid.

### Join page (`/join`)

- **On load** it reads `GET /me`. A 403 `registration-required` replaces the route with `/register?invitation_code=<code>`. Any other failure is the route's error screen.
- **The card:** title "Join a Household", the description "You're signed in as {identity}. Someone has invited you to join their Household.", a prefilled **Invitation code** field and a **Join** button, plus the small Sign out link every first-run card has. The UI can't name the Household before the code is redeemed: there is no preview operation, and it isn't needed.
- **Success (201):**
  1. invalidate `GET /households`;
  2. save the returned Household as the last-used one;
  3. navigate to `/households/{household_id}`, replacing the history entry.
- **409 `already-a-member`:** the problem as the form alert, plus a **Go to your Households** link to `/`. The UI keeps no list of problem types. It recognises this case by the status, 409, because `createMembership` has no other 409.
- **422:** the problem as the form alert, input kept, as on `/register`.
- **403 on submit:** this happens if the identity stopped being a User between load and submit, which can't really happen. Handle it the same as on load.

### `/register` changes

- **409 `already-registered`:** a User who presses Redeem goes to `/join?invitation_code=<code>`, not `/`. The Join page then redeems a Household code, or shows 422 for a bootstrap code, which a User has no use for anyway.
- **A Household code at `/register`:** an Unregistered person who redeems one already becomes a member (backend ticket 07). The existing "success → `/`" lands them in that Household, because it is their only one. Nothing changes here except a test.

### Members screen (`…/members`)

**Members**

- A table of members, from `GET …/members` (oldest first, as served).
- **Columns:** **Name** (display name, or "No name yet" in muted text), then **Joined** (a locale date).
- **Your own row** says "(you)" after the name, by comparing `user_id` with `GET /me`'s `user_id`. If you have no name, it adds a **Set your name** link that opens the same dialog as Your name….
- **Every other row** has a **Remove…** action.
- **Leave Household…** is a button in the screen header. With one member it is disabled, and a description linked by `aria-describedby` says "You're the only member. A Household always keeps at least one."

**Open Invitations**

- A second section, from `GET …/invitations`.
- **Columns:** **Issued by** ("you" for your own, else the display name or "No name yet"), **Issued** (date and time) and **Expires** (date and time).
- **Each row** has a **Revoke…** action.
- **With no open Invitations** it says "No open Invitations. An Invitation works once and expires 24 hours after it's issued."
- **Invite someone** is the section's primary button.

**Freshness:** the usual 30 s stale time and refetch on focus. The backend drops expired Invitations from the list, so a refetch is enough and the UI never filters by time itself.

### Invite dialog

**Step 1, confirm:** "Invite someone to {Household}". The description: "Whoever opens the link becomes a member and sees all of this Household's Accounts, Transactions and history. Send it only to the person you mean." A **Create Invitation** button sends `POST …/invitations` through the write wrapper, so it carries an Idempotency-Key and a retry returns the same code.

**Step 2, the code** (same dialog, after 201):

- **Link:** a read-only **Invitation link** field holding `{origin}/join?invitation_code={code}`, with a **Copy link** button.
- **Code:** a read-only **Code** field holding the bare code, with **Copy code**.
- **Copying:** uses `navigator.clipboard.writeText`. On success, a polite live region says "Copied". If the clipboard isn't available, the field's text is selected so the User can copy it by hand.
- **The warning line:** "It works once and expires {expires_at as date and time}. You won't see this code again after you close this dialog."
- **Close:** closes the dialog and invalidates `GET …/invitations`. There is no "are you sure" prompt: the warning is on screen, and the Invitation can be revoked and another issued.
- **Failure:** a failed issue is the form alert on step 1, as for any form.

### Revoke, Remove and Leave

All three use an AlertDialog with a title, a description and Cancel plus a destructive confirm button. A refusal shows the problem as the dialog's alert, and the dialog stays open.

| Action | Dialog | On success | Refusal handled |
|---|---|---|---|
| **Revoke** (`DELETE …/invitations/{id}`) | "Revoke this Invitation?" / "Its link stops working at once." | invalidate Invitations | 404 (redeemed, revoked or expired since the list loaded): close the dialog, show a toast with the problem, refetch |
| **Remove** (`DELETE …/members/{user_id}`) | "Remove {name}?" / "They lose access to {Household} at once. They can come back only with a new Invitation." | invalidate members | 404 (already gone): close, toast, refetch |
| **Leave** (`DELETE …/members/{my user_id}`) | "Leave {Household}?" / "You lose access at once. You can come back only with a new Invitation from a member." | invalidate `GET /households`, forget the last-used Household if it's this one, navigate to `/` (another Household, or `/households/new`) | 409 `last-member`: the problem as the alert. This only happens in a race, since the button is disabled for one member |

### Losing access

- **What happens:** a removed member's next Household request gets 404, because every Household route checks membership.
- **Where it shows:** the Household route's loader already turns a 404 on `GET /households/{id}` into `notFound()`. It gets its own not-found component: "You're not a member of this Household" / "It may have been removed from your list because a member removed you, or the link is wrong." with **Go to your Households** (`/`). It also forgets the last-used Household when that's the one, so `/` doesn't bounce back.
- **While the shell is open:** the Household query refetches on focus. When that refetch gets 404, the route shows the same screen. Reads further down the screen that 404 keep their own "not found" handling, and the next focus or navigation brings up the route-level screen.

### Display name

- **Reading it:** the User menu reads `GET /me`, cached app-wide with the usual stale time. It shows `display_name`, and falls back to the token's name as today while the read loads or when there's no name. It keeps the email line.
- **With no display name:** the menu's trigger shows a small dot and the item reads **Set your name…**. With a name, the item reads **Your name…**. Both open the same dialog.
- **The dialog:**
  - title "Your name", description "Other members of your Households see this name.";
  - one **Display name** field, prefilled, using the same Zod rules and messages as `/register` (trimmed, required, at most 64);
  - submits `PATCH /me`, and on 200 updates the `GET /me` cache and invalidates every `…/members` query;
  - a 422 `invalid-user` is the form alert.

### Notifications

- **Copy for the member kinds:**
  - `MEMBER_JOINED` → "{member} joined the Household"
  - `MEMBER_LEFT` → "{member} left the Household"
  - `MEMBER_REMOVED` → "{removed_by} removed {member}"
- **Names:** `display_name` is used when present. A UserRef without a name reads "A member". When a UserRef's `user_id` is the caller's own, it reads "You": "You removed Ana", "Rui removed you", "You joined the Household".
- **Clicking:** marks the Notification read and opens `…/members`. `SUSPECTED_DUPLICATES_FOUND` is unchanged, and any other unknown kind still shows as sent.
- **Messages:** the strings go in the message files, and `notificationKinds` learns the three kinds. A Notification whose kind is known but which lacks `member` falls back to the unknown-kind display, the same way `SUSPECTED_DUPLICATES_FOUND` without `account_id` already does.

### Mocks

- **Mock state:** `src/mocks/handlers.ts` gains in-memory members and Invitations per Household, `createMembership`, `PATCH /me`, and member Notifications. The handlers are typed by openapi-msw, as now.
- **Fixed codes:** the mock exposes fixed codes for e2e: a valid Household code, a code for a Household the mock User already belongs to (409), and an invalid one (422).
- **Seeding:** a `mock-…` search parameter (like the existing `mock-fail`) seeds an Unregistered identity, a User with no display name, and a second member, so each flow can be reached.

### Strings and accessibility

- Every string goes in the English message files.
- Each dialog has a title, a description and a visible close.
- The tables are real tables with header cells.
- The copy buttons have accessible names ("Copy link", "Copy code"), and "Copied" is announced politely.
- axe runs on every screen and state above.

## Testing Decisions

- **Same bar as the first slice:** drive the UI by role, label and keyboard, and assert on what the User sees and what goes over the network. Never mock the API client.
- **Unit tests:**
  - the notification text for each member kind, including "You", a missing name and a missing `member`;
  - building the Invitation link from the origin and code;
  - the display-name Zod schema, which is shared with `/register`.
- **E2e (Playwright with MSW and axe):**
  - **Members screen:** the "(you)" marker; Leave disabled when you're alone.
  - **Invite:** issuing shows the link and code once; closing the dialog lists the Invitation without its code; Revoke removes it; Revoke on a row that's gone gives a toast.
  - **Remove** another member.
  - **Leave:** lands in the other Household, or on `/households/new` when it was your only one.
  - **Join:** success lands in the Household and the switcher lists it; 409 shows the link to `/`; 422 shows the alert; Unregistered goes to `/register` with the code kept.
  - **`/register`:** 409 goes to `/join` with the code; a Household code as Unregistered lands in that Household.
  - **Your name:** set, change, and the blank-name 422.
  - **Notifications:** each member kind's text and its link.
  - **The not-member screen**, reached by a mock that drops the caller from a Household.
- **Real-stack smoke test:** a second Zitadel user joins the first user's Household through an Invitation link. This waits for a backend release that carries join-household.

## Out of Scope

- **A preview of the Household before joining:** the contract has no such operation.
- **Choosing an Invitation's lifetime, or sending it by email:** the backend has neither.
- **Roles inside a Household,** or per-Account sharing (ADR-0003).
- **Deleting or transferring a Household.**
- **An Instance administrator area.**
- **QR codes** for the Invitation link.
- **Showing a code again after the dialog closes:** the backend never returns it twice.

## Tickets

| # | Ticket | Blocked by | Backend |
|---|---|---|---|
| 01 | [Move the contract to v0.4.0](issues/01-move-the-contract-to-v0.4.0.md) | | resolved |
| 02 | [Your display name in the User menu](issues/02-your-display-name.md) | | mocks now; real API after release |
| 03 | [The Members screen](issues/03-members-screen.md) | 02 | mocks now; real API after release |
| 04 | [Invite someone, list and revoke open Invitations](issues/04-invite-and-open-invitations.md) | 03 | mocks now; real API after release |
| 05 | [The Join page, and `/register` sending Users to it](issues/05-join-page.md) | | mocks now; real API after release |
| 06 | [Remove a member, or leave the Household](issues/06-remove-a-member-and-leave.md) | 03 | mocks now; real API after release |
| 07 | [The "not a member of this Household" screen](issues/07-no-longer-a-member-screen.md) | | ready |
| 08 | [Member Notifications in the bell](issues/08-member-notifications.md) | 03 | mocks now; real API after release |
| 09 | [Real-stack smoke test: a second member joins](issues/09-smoke-test-a-second-member-joins.md) | 04, 05 | ⚠️ waits for a backend release with join-household |

02, 05 and 07 can start at once. 04, 06 and 08 can run in parallel after 03. Tickets that touch `src/mocks/handlers.ts` in parallel should expect merge conflicts there.

## Further Notes

- **Backend status (2026-11-25):** every join-household ticket (03–10) is done on the backend's `join-household` branch, but that branch is not merged into main or tagged. Every released backend still answers the new operations with 501. All tickets here can be built and tested against the mocks now. Against the real API they show the 501 problem until a release carries join-household. Only the smoke test ticket waits on that release.
- **Ticket 01's open item:** the real-stack smoke test hasn't been run against v0.4.0 or later. Ticket 09 runs it.
- **Decided without a grilling (correct any of these):**
  - one Members screen holds both members and Invitations, instead of two screens;
  - the Invitation link is `/join?invitation_code=`, which forwards Unregistered people to `/register`, instead of handing out `/register` links;
  - `/join` doesn't auto-submit;
  - Revoke has a confirmation step;
  - Users without a display name get a dot and **Set your name…** in the User menu, not a blocking prompt;
  - a 409 on `/register` goes to `/join` instead of `/`.
