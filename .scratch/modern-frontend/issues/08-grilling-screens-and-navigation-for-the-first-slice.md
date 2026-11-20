# Grilling: screens and navigation for the first slice

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by:

## Question

What are the screens of the first UI slice, and how does a User move between them?

Working from the backend's first-slice spec (`../wallet-accountant/.scratch/statement-import-to-month-close/spec.md`) and the API: list the screens, the navigation (sidebar, top bar), how the current Household is chosen and switched, the URL structure (Household and Account in the path?), what the landing screen is after sign-in, and where Notifications appear. Domain terms are used exactly.

## Answer

Decided with the user on 2026-11-20.

### Shell

A left sidebar, collapsing to a drawer on narrow screens. From top to bottom:

- **Household switcher**, listing the User's Households and "Create Household"
- **Accounts**, one link each, with its balance or "awaiting first Statement import", and its count of rows To review (depends on [Grilling: overview reads the backend must serve](11-grilling-overview-reads-the-backend-must-serve.md))
- **Categories**
- **Notifications bell** with an unread badge, opening a dropdown panel (no Notifications page)
- **User menu**: name from the sign-in token, Sign out

There is no Instance administrator area: issuing Invitations from the app is out of the backend's first slice.

### Routes

The Household is in the path, mirroring the API. The last-used Household is remembered only to pick where `/` lands.

| Route | Screen |
|---|---|
| `/auth/callback` | Sign-in callback (reserved by [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md)) |
| `/register` | Redeem Invitation, for someone Unregistered (API: 403 `registration-required`) |
| `/households/new` | Create Household, when the User has none. Afterwards, creating one is a dialog from the switcher. |
| `/` | Redirect: Unregistered → `/register`; no Household → `/households/new`; otherwise the last-used Household (or the first) at its home |
| `/households/:householdId` | Home: the **Accounts overview**, a table of Accounts with balance, Account currency, rows To review and the latest month's state, plus "Add Account" (a dialog) |
| `/households/:householdId/categories` | Category tree, including Internal Categories: Create, Rename and Move inline or in a small dialog |
| `…/accounts/:accountId` | While awaiting its first Statement import: a getting-started state ("Create a Connection → Import the first statement"). Otherwise redirects to `transactions`. |
| `…/accounts/:accountId/to-review?booking_month=YYYY-MM` | **To review**: pending Imported transactions and Suspected duplicates (each beside what it `resembles`), with Accept, Keep and Discard. Without a month: everything still to do, oldest first. |
| `…/accounts/:accountId/transactions?booking_month=YYYY-MM` | Single-entry Transaction list. Change Category (picker in the row) and Reverse (row menu, with confirmation) are row actions; a reversal shows linked to its original. No Transaction detail route: the API has none. |
| `…/accounts/:accountId/months` | The Account's months and their status (how it is fed depends on [Grilling: overview reads the backend must serve](11-grilling-overview-reads-the-backend-must-serve.md)) |
| `…/accounts/:accountId/months/:bookingMonth` | One month: status, Statement balance, computed balance, blockers, and the **Close month** form |
| `…/accounts/:accountId/statement-imports` | Statement imports of all the Account's Connections, with Void on the latest |
| `…/accounts/:accountId/statement-imports/new` | The Statement import flow (full page, steps below) |
| `…/accounts/:accountId/connections`, `…/new`, `…/:connectionId` | Connections, and the full-page CSV mapping editor |

`/households/:householdId/…` is abbreviated `…`. A 404 from the API (another Household, or a resource that doesn't exist) shows a plain "not found" screen.

### Account area

- **Tabs**: To review, Transactions, Months, Statement imports, Connections. The default is Transactions, except the getting-started state above.
- **Booking month**: an optional `booking_month` search parameter on To review and Transactions, named as in the API. Switching between those two tabs keeps it.
- **"Import statement"** sits in the Account header on every tab.

### Flows (their detail stays in Not yet specified)

- **Add Account** (dialog) → that Account's getting-started state.
- **Statement import** (`statement-imports/new`):
  1. Choose the Connection (skipped with one; offers to create one with none).
  2. File and Export balance (typed twice on the first import).
  3. First import only: preview with the Opening balance, then Confirm.
  4. Result: imported, skipped and Suspected duplicate counts, linking to To review.
- **Month close** (`months/:bookingMonth`): each blocker links to where it is fixed. Pending or Suspected duplicates → To review for that month. Uncategorised → Transactions for that month filtered to Uncategorised (a client-side filter on the loaded page; the API has no Category filter). An unchecked Statement import → Statement imports. A refused close shows the same list from the problem's `reasons`.
- **Notifications**: clicking a `SUSPECTED_DUPLICATES_FOUND` Notification marks it read and opens that Account's To review, filtered to Suspected duplicates.

### Language

"To review" is a UI-only label, recorded in this repo's `CONTEXT.md`. Everything inside it uses the domain terms exactly (Pending, Suspected duplicate, Accept, Keep, Discard).

### Deferred

At the user's request, the overview reads the API doesn't serve yet (a list of an Account's months, and a To review count per Account) go to [Grilling: overview reads the backend must serve](11-grilling-overview-reads-the-backend-must-serve.md), to be taken last.
