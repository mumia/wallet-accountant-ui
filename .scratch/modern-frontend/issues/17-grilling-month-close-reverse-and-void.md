# Grilling: Month close, Reverse and Void

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 12, 13

## Question

How do the one-month screen and the two corrective actions work in detail?

- **Month close**: how the month shows its status, Statement balance, computed balance and blockers; how every refusal reason in the problem's `reasons` is listed and linked (per [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md)); what the Close month form asks for and confirms.
- **Reverse** a Transaction and **Void** the latest Statement import: the confirmation wording, what the User sees afterwards, and when each action is unavailable (closed month, not the latest import, …).

## Comments

**2026-11-20, from [Grilling: the Statement import flow](16-grilling-the-statement-import-flow.md):** the Statement imports tab takes an optional `?statement_import_id=` that highlights one import (linked from a duplicate-file refusal). The flow's Balance-check-failed hint links to this tab, where Void lives.
