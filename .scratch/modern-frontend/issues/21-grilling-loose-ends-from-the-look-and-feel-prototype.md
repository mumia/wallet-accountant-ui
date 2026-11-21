# Grilling: loose ends from the look-and-feel prototype

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by:

## Question

[Prototype: look and feel](09-prototype-look-and-feel.md) passed three questions to [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md), which didn't settle them. Found while assembling the handoff ([Task: assemble the handoff](19-task-assemble-the-handoff.md)).

- **Fonts**: are the four presets' fonts bundled with the app or loaded from Google Fonts? Weigh privacy (a finance app calling a third party), the offline local cluster, the UI contract's "nothing baked in" config, and the stand-in UI's "vendored, no CDN".
- **shadcn/ui parts**: `npx shadcn add` hung in Docker at "Checking registry"; the prototype fetched components with a small script. How are parts added and later updated, given Node only runs in Docker?
- **TanStack Table major**: v8 (used in the prototype) or v9 (out), given exact pins and Renovate.

On resolution, replace the **Open** marker in the spec's Stack section ([the spec](../spec.md)) and add the answers to the conventions doc outline in ticket 10 if they belong there.
