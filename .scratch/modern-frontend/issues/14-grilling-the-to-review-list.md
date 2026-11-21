# Grilling: the To review list

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 12, 13

## Question

How does the To review tab work in detail?

Starting from the prototyped To review tab ([Prototype: look and feel](09-prototype-look-and-feel.md)) and the routes in [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md): how pending Imported transactions and Suspected duplicates are laid out (a Suspected duplicate beside what it `resembles`), how Accept, Keep and Discard are triggered (per row, bulk, keyboard-driven?), how the Category is chosen on Accept, what happens to a row after the action (removed, undo?), the `booking_month` filter and the Suspected-duplicates filter from a Notification, and the empty state.

## Answer

Decided with the user on 2026-11-20, against `../wallet-accountant/api/openapi.yaml` and the prototype's To review tab (`prototype/look-and-feel`, `prototypes/look-and-feel/shadcn/src/to-review.tsx`). Facts from the contract: Accept, Keep and Discard act on one Imported transaction each (no bulk endpoint); `listImportedTransactions` filters by one `state`; a Suspected duplicate carries the earlier row it `resembles` (date, amount, description, state), still shown after it is Kept; Accept takes any of the Household's Categories, parents included, or Uncategorised (absent `category_id` means Uncategorised), and no other Internal Category; Discard is final; an Accept is undone only by Reversing its Transaction, which puts the row back to Pending.

### Layout

- Two sections on one page: **Suspected duplicates** first, then **Pending**. A section with no rows is hidden.
- They are two queries (`state=SUSPECTED_DUPLICATE`, `state=PENDING`), each with the Account's `booking_month` when set. Suspected duplicates always load in full; Pending loads the whole month when one is chosen, otherwise infinite scroll with virtualisation ([Grilling: talking to the API](12-grilling-talking-to-the-api.md)).
- Rows keep the API's order (oldest Booking date first, then file line). **No column sorting**: it would mislead on a partly loaded list.
- Columns: checkbox, Booking date (the Transaction date under it when it differs), payee and description, amount, Category (Pending rows only), actions. Value date and the bank's transaction ID are not shown.

### Suspected duplicates

- A dashed "Resembles: 12 Mar · Albert Heijn · −23.40 EUR · Accepted" box under the description, as prototyped. Fields that match are shown the same way; ones that differ are marked with text, not colour alone.
- No link to the resembled row (no detail route; it may be in another month).
- Row actions: Keep and Discard. Keep moves the row into Pending, its Resembles box still shown.

### Choosing the Category on Accept

- Each Pending row has a Category picker starting on Uncategorised; the row's Accept sends what it shows. No default from rules or the last-used Category.
- **A parent Category can be picked.** The picker (Base UI Combobox) lists every Category as an indented option, searchable by full path ("Food › Groceries"), grouped by **kind**: Uncategorised first, then Expense, then Income. Internal Categories other than Uncategorised are hidden. This amends the group design in [Grilling: the accessibility bar](13-grilling-the-accessibility-bar.md), where parents were group labels.

### Bulk actions

- Selection as decided in the accessibility ticket (row-labelled checkboxes, Shift+click ranges). Each section has its own header checkbox; "select all" selects the rows loaded so far, and the bar names the count.
- The bulk bar offers **Accept as [Category]**, **Keep** and **Discard**, each only when it applies to every selected row.
- The browser sends one request per row, about 4 at a time, each with its own Idempotency-Key, and reports "18 Accepted, 2 failed"; failed rows stay selected. A backend bulk endpoint is asked for only if this proves slow.

### After an action

- **Optimistic**: Accept and Discard remove the row at once, Keep moves it into Pending; on failure the row returns and a toast names it. The affected reads (Transactions, the Account's balance, the month, Notifications) are invalidated afterwards.
- **No Undo.** The Accept toast reads "Accepted · View in Transactions"; undoing an Accept is Reverse on the Transactions tab.
- **Discard asks for confirmation** (one dialog for one row or many), since it is final.
- A 409 saying the row was already Accepted or Discarded (another Household member got there first) is not a failure: the row stays gone, the lists are refetched, and a toast names the row ("Already Accepted").

### Keyboard

No shortcuts at launch: Tab, the buttons and the picker suffice. Revisit if reviewing feels slow; any shortcut then needs a modifier or a way to turn it off (WCAG 2.1.4).

### Filters (URL search parameters)

- `booking_month=YYYY-MM`: a month field with previous/next arrows and "All months". Listing only months that have rows waits on [Grilling: overview reads the backend must serve](11-grilling-overview-reads-the-backend-must-serve.md).
- `state=SUSPECTED_DUPLICATE`, named as in the API: shows only the Suspected duplicates section, with "Show everything" to clear it. A `SUSPECTED_DUPLICATES_FOUND` Notification opens this. No filter by Statement import.

### Empty states

- Nothing at all: "Nothing to review", linking to Transactions.
- Nothing in the chosen month: "Nothing to review in March 2026", with "Show all months" and "Go to March 2026" (that month's close page).
- An Account awaiting its first Statement import never shows this tab's empty state: it gets the getting-started state ([Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md)).

No backend changes.

## Comments

**2026-11-20, from [Grilling: the accessibility bar](13-grilling-the-accessibility-bar.md):** the Category picker is Base UI Combobox with groups (parent Categories as group labels, full-path search); decide here whether a parent Category itself can be picked. Bulk selection is plain checkboxes labelled from the row, Shift+click for ranges. Any Accept/Keep/Discard keyboard shortcuts need a modifier or a way to turn them off (WCAG 2.1.4).

**2026-11-20, from [Grilling: Month close, Reverse and Void](17-grilling-month-close-reverse-and-void.md) (amendment):** only one month per Account is open. Rows booked in a month not open yet show with no Accept, Keep or Discard and a note "February 2026 isn't open yet"; rows in a closed month never reach To review (ignored on import).

**2026-11-21, from [Grilling: overview reads the backend must serve](11-grilling-overview-reads-the-backend-must-serve.md):** the month picker offers only months whose `pending + suspected_duplicates` is above zero, read from the new `GET …/accounts/{account_id}/months`.
