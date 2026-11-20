# Grilling: the To review list

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 12, 13

## Question

How does the To review tab work in detail?

Starting from the prototyped To review tab ([Prototype: look and feel](09-prototype-look-and-feel.md)) and the routes in [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md): how pending Imported transactions and Suspected duplicates are laid out (a Suspected duplicate beside what it `resembles`), how Accept, Keep and Discard are triggered (per row, bulk, keyboard-driven?), how the Category is chosen on Accept, what happens to a row after the action (removed, undo?), the `booking_month` filter and the Suspected-duplicates filter from a Notification, and the empty state.

## Comments

**2026-11-20, from [Grilling: the accessibility bar](13-grilling-the-accessibility-bar.md):** the Category picker is Base UI Combobox with groups (parent Categories as group labels, full-path search); decide here whether a parent Category itself can be picked. Bulk selection is plain checkboxes labelled from the row, Shift+click for ranges. Any Accept/Keep/Discard keyboard shortcuts need a modifier or a way to turn them off (WCAG 2.1.4).
