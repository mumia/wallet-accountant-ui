# Task: assemble the handoff

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: task
Status: open
Blocked by: 11, 12, 13, 14, 15, 16, 17, 18

## Question

Write the destination: the UI spec for the first slice, in the shape of the backend's `.scratch/statement-import-to-month-close/spec.md`, built from every resolved ticket on the map; the Backend changes list as a separate handoff to `wallet-accountant`; and the two ADRs in `docs/adr/` (Application stack, Exact money in the browser) per [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md). AFK; nothing new is decided here, and any gap found goes back on the map as a ticket.

The backend handoff also includes a **prompt for the `grilling` skill in `wallet-accountant`** (requested by the user on 2026-11-20). Collect every open item from the map's Backend changes section and the `## Backend changes` heading of each resolved ticket (leave out items already marked done), then write a self-contained prompt the user can paste into a backend session: what the UI needs and why, the constraints the UI already fixed (field names, shapes, problem types, defaults), what is left to the backend to decide, and a link to the deciding ticket for each item. Save it next to the spec and link it from the map.
