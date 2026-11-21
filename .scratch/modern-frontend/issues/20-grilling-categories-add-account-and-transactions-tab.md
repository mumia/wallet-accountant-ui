# Grilling: the Categories screen, Add Account and the Transactions tab

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by:

## Question

How do the three screens the map never detailed work?

Found while assembling the handoff ([Task: assemble the handoff](19-task-assemble-the-handoff.md)): [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md) fixed their routes only ("Create, Rename and Move inline or in a small dialog").

- **Categories** (`…/categories`): how the tree is shown (Expense and Income apart? Internal Categories marked and read-only?); Create, Rename and Move — inline or a dialog, and how Move picks the new parent (the Category picker from [Grilling: the accessibility bar](13-grilling-the-accessibility-bar.md)?); how the backend's rules read (sub-Category keeps its parent's kind, unique among siblings, no Internal Categories by hand).
- **Add Account** (dialog): fields (name, kind, Account currency from `GET /currencies`, start date), defaults, help text (the start date and the first Statement import), kind labels, and how a refused cash kind is avoided.
- **Transactions tab**: columns (Booking date, Transaction date, payee/description, amount, Category, row menu), the month filter control (shared with To review?), the Uncategorised filter control, the empty states, and how the Category picker behaves in a row (save on pick? optimistic?).

On resolution, replace the two **Open** markers about these screens in [the spec](../spec.md) (user stories 14 and 38, and the "Categories, Add Account and the Transaction list" section) with the decisions.

## Answer

Decided with the user on 2026-11-21, against `../wallet-accountant/api/openapi.yaml`. Facts from the contract that shaped it: Categories have no Delete; Accounts have no rename or edit; `AccountTransaction` has a `description` but no payee; the Transaction list is oldest first, paged; `PATCH /transactions/{id}` changes only the Category.

### Categories (`…/categories`)

- Three sections: **Expense**, **Income**, then **Internal**, each an indented tree (siblings in API order, by name). Chevrons expand and collapse; everything starts expanded and the state isn't saved.
- The Internal section is muted, with a lock and "Created by Wallet Accountant. Can't be renamed or moved." Its rows have no actions.
- **Create**: "New Category" in the Expense and Income section headers makes a root Category of that kind; a row's menu has "Add sub-Category", whose dialog shows "Under: Food › Eating out". Kind is never asked: it comes from the section or the parent.
- **Rename**: the same one-field **Name** dialog, prefilled, from the row menu.
- **Move**: "Move…" in the row menu opens a dialog with the Category picker from [Grilling: the accessibility bar](13-grilling-the-accessibility-bar.md), listing only Categories of the same kind, without the Category itself and its sub-Categories, plus "Top level". No drag and drop.
- Not optimistic: the tree reloads on success. A 409 `category-name-taken` shows on the Name field ("There's already a Category named "Coffee" here."); any other 422 is the form alert ([Grilling: talking to the API](12-grilling-talking-to-the-api.md)). `internal-category` can't arise, since Internal rows have no actions.
- No Delete: the backend has none, and deleting or archiving a Category is out of scope for this slice.

### Add Account (dialog)

- **Name**: placeholder "Main".
- **Kind**: radio cards Bank account, Credit card, Loan, Crypto wallet; Bank account preselected. Cash isn't offered, so it is never refused.
- **Account currency**: the searchable combobox used for Base currency, preselected to the Household's Base currency. Help: "It can't be changed later."
- **Start date**: a typed date field with a calendar popover, formatted for the locale; defaults to the 1st of the current month; capped at today in the UI (the backend allows later dates). Help: "The day this Account's history begins. Your first statement file must cover from this day to today; rows booked before it are ignored. It can't be changed later."
- Success leads to the getting-started state, as already decided.
- **Rename Account**: a small menu on the Account header (beside "Import statement") with "Rename…", a one-field dialog; a blank name is refused (1–200 characters). Needs a backend change (below).

### Transactions tab

- **Columns**, matching To review: Booking date (Transaction date under it when different), Description, Amount (right-aligned, signed, locale money format), Category (the row picker), row menu. No payee column (no such field) and no running balance.
- The Opening balance Transaction, reversals and reversed rows show their Category as text, without a picker. The row menu holds only Reverse and is hidden where Reverse doesn't apply.
- **Month filter**: the To review month field (arrows and "All months"), offering every month from the months list. With no `booking_month` the tab shows the Account's open month; "All months" is `booking_month=all` (API order, oldest first, infinite scroll). An explicit month carries over to To review, as already decided.
- **Uncategorised filter**: a toggle chip "Uncategorised only (7)" beside the month field, `uncategorised=true` in the URL, the count from the loaded month. Enabled only for a single month (client-side over a fully loaded month); otherwise disabled with "Choose a month first". The Month close "Uncategorised" blocker links here with both parameters.
- **Category picker in a row**: the To review picker (parents pickable, grouped by kind; no Uncategorised in closed months). Saves on pick, optimistic, rolled back with a toast on failure, no Undo; retried per ticket 12 (the PATCH is safe to repeat). With the Uncategorised filter on, a row that gets a Category stays until the filter changes or the page reloads.
- **Empty states**: "No Transactions in March 2026" with "Show all months", plus "Go to To review" when the month has rows To review; with the Uncategorised filter on and nothing left, "Everything in March 2026 has a Category ✓" with "Show all Transactions".

## Backend changes

- Rename an Account: e.g. `PATCH /households/{household_id}/accounts/{account_id}` with `name` (1–200 characters, not blank, not required unique), 422 `/problems/invalid-account` when blank.
