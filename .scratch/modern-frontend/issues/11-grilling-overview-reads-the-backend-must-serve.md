# Grilling: overview reads the backend must serve

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
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

## Answer

Decided with the user on 2026-11-21, against `../wallet-accountant/api/openapi.yaml`, where months are read one at a time, `Account` carries no counts, and Imported transaction pages carry no totals.

### Months

- **An Account's months list**: `GET …/accounts/{account_id}/months` returns one `AccountMonth` per Booking month, newest first, unpaged (about twelve a year). It runs from the start date's month to the later of the current calendar month and the last month holding a booked row.
- **It answers from the Account's creation**, also while the Account awaits its first Statement import: the start date's month `OPEN`, the rest `NOT_OPEN_YET`. The UI never reaches the Months tab in that state anyway (getting-started state).
- **`NOT_OPEN_YET`** joins `OPEN` and `CLOSED` in `AccountMonth.state`: the backend owns the month rules, and Reopen changes which months are not open yet, so the UI doesn't derive it.
- **A future month holding booked rows** (a value date just past today) is a real Not open yet month, both in the list and on the month screen (amends [Grilling: Month close, Reverse and Void](17-grilling-month-close-reverse-and-void.md)).

### Per-Account summary on `Account`

- **`pending` and `suspected_duplicates`** counts over the whole Account, including rows in months not open yet, so the badge matches what the unfiltered To review list shows. The backend keeps domain terms; the UI sums them as "To review" (a UI-only label).
- **`open_month`** (YYYY-MM, required, set from creation to the start date's month).

### Screens

- **Sidebar and Accounts overview**: To review = `pending + suspected_duplicates`; the overview's month column shows "Open month: October 2026", linking to that month's screen, or "awaiting first Statement import" when `awaiting_first_statement_import` is true. Blockers stay on the month screen. Both read only `GET …/accounts`: no call per Account.
- **Months tab**: the months list, each row with its month, state badge and counts, linking to the month screen.
- **To review month picker**: offers only months whose `pending + suspected_duplicates` is above zero, from the months list (settles the open point in [Grilling: the To review list](14-grilling-the-to-review-list.md)).
- **Freshness**: Accept, Keep, Discard, Reverse, Statement import, Void, Close and Reopen invalidate the Accounts and months queries, per [Grilling: talking to the API](12-grilling-talking-to-the-api.md).

## Backend changes

1. **`GET …/accounts/{account_id}/months`**: every Booking month of the Account as `AccountMonth`, newest first, unpaged, from the start date's month to the later of the current month and the last month holding a booked row; answers from creation.
2. **`pending` and `suspected_duplicates` on `Account`**: counts over the whole Account, months not open yet included.
3. **`open_month` on `Account`**: required YYYY-MM, the start date's month at creation.
4. **`NOT_OPEN_YET` in `AccountMonth.state`**.

