# Grilling: overview reads the backend must serve

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 08, 09, 10, 12, 13, 14, 15, 16, 17, 18

**Take this ticket last**, after every other ticket on the map, at the user's request (see [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md)). Add any ticket created later to `Blocked by`.

## Question

Which summary reads must the backend serve so the overview screens work without one API call per month or per Account?

Two gaps found while deciding the screens:

- **An Account's months.** The Months tab and the Accounts overview's "latest month's state" need every Booking month from the start date onward with its status. The API only has `GET …/accounts/{account_id}/months/{booking_month}`, one month at a time. Options: a new `GET …/accounts/{account_id}/months` (⚠️ backend), one call per month from the UI, or no overview (a month picker only).
- **A To review count per Account.** The sidebar and the Accounts overview show how many rows each Account has To review (pending plus Suspected duplicates). `Account` carries no such count, and the only counts are per month in `AccountMonth`. Options: a count on `Account` (⚠️ backend), deriving it from the months list, or dropping it.

Any answer that changes the API goes under `## Backend changes` and onto the map's Backend changes list.


## Comments

**2026-11-20, from [Grilling: Month close, Reverse and Void](17-grilling-month-close-reverse-and-void.md):** Month close is now sequential with one open month per Account, Reopen exists for the latest closed month, and `flagged` is gone. The Months list and the Accounts overview's "latest month's state" should show the open month and the not-open-yet ones accordingly.
