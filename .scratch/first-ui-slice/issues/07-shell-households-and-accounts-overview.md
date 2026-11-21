# Shell, Households and the Accounts overview

Status: open
Blocked by: 06
Waits on backend: none for this ticket. The To review counts and open month are ticket 19.

## What to build

The app shell and the Household's home.

- Left sidebar (a drawer on narrow screens) with the Household switcher and its "Create Household" dialog, Accounts (balance or "awaiting first Statement import"), Categories, a placeholder slot for the Notifications bell, and the User menu (name from the token, Appearance…, Sign out).
- The Household in the URL path (`/households/:householdId`), with the last-used Household remembered.
- The Accounts overview as a table with balance and Account currency, and the empty state "Add your first Account…". Its **Add Account** button opens ticket 08's dialog.
- The "not found" screen for links to anything the User can't see, and inline load errors with "Try again".
- The sidebar and overview read only `GET …/accounts`.

## Acceptance criteria

- [ ] Switching Households changes the URL, and back/forward work.
- [ ] The shell meets 320 px reflow and 200% zoom. axe passes. Focus is never hidden by the sidebar.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 8–12, 16; Screens and routes (Shell, Accounts overview).

## Notes

- From ticket 05: `components/appearance-dialog.tsx` is ready, with `open` and `onOpenChange`. Wire "Appearance…" in the User menu to it, and remove the placeholder welcome page's button with the page itself.
