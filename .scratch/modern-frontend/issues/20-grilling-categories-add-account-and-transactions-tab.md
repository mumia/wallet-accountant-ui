# Grilling: the Categories screen, Add Account and the Transactions tab

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by:

## Question

How do the three screens the map never detailed work?

Found while assembling the handoff ([Task: assemble the handoff](19-task-assemble-the-handoff.md)): [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md) fixed their routes only ("Create, Rename and Move inline or in a small dialog").

- **Categories** (`…/categories`): how the tree is shown (Expense and Income apart? Internal Categories marked and read-only?); Create, Rename and Move — inline or a dialog, and how Move picks the new parent (the Category picker from [Grilling: the accessibility bar](13-grilling-the-accessibility-bar.md)?); how the backend's rules read (sub-Category keeps its parent's kind, unique among siblings, no Internal Categories by hand).
- **Add Account** (dialog): fields (name, kind, Account currency from `GET /currencies`, start date), defaults, help text (the start date and the first Statement import), kind labels, and how a refused cash kind is avoided.
- **Transactions tab**: columns (Booking date, Transaction date, payee/description, amount, Category, row menu), the month filter control (shared with To review?), the Uncategorised filter control, the empty states, and how the Category picker behaves in a row (save on pick? optimistic?).

On resolution, replace the two **Open** markers about these screens in [the spec](../spec.md) (user stories 14 and 38, and the "Categories, Add Account and the Transaction list" section) with the decisions.
