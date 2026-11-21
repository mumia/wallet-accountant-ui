# Grilling: loose ends from the look-and-feel prototype

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by:

## Question

[Prototype: look and feel](09-prototype-look-and-feel.md) passed three questions to [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md), which didn't settle them. Found while assembling the handoff ([Task: assemble the handoff](19-task-assemble-the-handoff.md)).

- **Fonts**: are the four presets' fonts bundled with the app or loaded from Google Fonts? Weigh privacy (a finance app calling a third party), the offline local cluster, the UI contract's "nothing baked in" config, and the stand-in UI's "vendored, no CDN".
- **shadcn/ui parts**: `npx shadcn add` hung in Docker at "Checking registry"; the prototype fetched components with a small script. How are parts added and later updated, given Node only runs in Docker?
- **TanStack Table major**: v8 (used in the prototype) or v9 (out), given exact pins and Renovate.

On resolution, replace the **Open** marker in the spec's Stack section ([the spec](../spec.md)) and add the answers to the conventions doc outline in ticket 10 if they belong there.

## Answer

Resolved 2026-11-21.

- **Fonts are bundled, never loaded from a third party.** The four preset fonts (Geist, IBM Plex Sans, Inter, Nunito Sans) come from Fontsource's variable packages (`@fontsource-variable/<name>`). Like every dependency, they are pinned exactly and updated by Renovate, and Caddy serves them from the app's own origin. `system-ui` is the fallback. The browser downloads a font only when the active preset uses it, so bundling all four costs nothing at runtime. Reasons: a finance app shouldn't tell Google about every visit, the offline local cluster has no internet, it matches the stand-in UI's "vendored, no CDN" rule, and a later Content-Security-Policy stays same-origin. The prototype's Google Fonts `<link>` goes away.
- **shadcn parts are added with the real CLI, through Make.** `make ui-add c="button dialog"` runs `npx shadcn add <parts> --yes` in the Node container with no keyboard input attached, using the `shadcn` version pinned in `package.json`. Tested on 2026-11-21 (shadcn 4.23.0, `node:24`, the prototype's `components.json`): `button` installed without hanging. The prototype's hang was the CLI waiting at a prompt nobody could see, not the registry, so the prototype's fetch script is not carried over.
  - **Updating** is done by hand, when an upstream fix is worth having: run the same target with `--overwrite`, read the `git diff`, and put back any of our changes worth keeping. Renovate bumps only the CLI and never rewrites parts.
  - **Our changes**: edit `src/components/ui/` only when the change can't live in a wrapper in `components/` or in a prop, and mark each change with a `// local:` comment so it stands out in the update diff.
- **TanStack Table v9**, at the latest 9.x, pinned exactly. v9 has been stable since 4 Aug 2026 (`useTable` with a required `features` option). On v8, Renovate's first PR would be a major-version migration. The extra translating from shadcn's v8-based data-table guide happens once, in the shared `components/data-table`. If the build effort finds a blocking v9 problem in that first table, it falls back to v8.21.

For the conventions doc outlined in [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md): **Commands** gains `make ui-add`; **Lint and format** (the shadcn/ui rule) gains the `// local:` marker and the wrapper-first rule; **Dependencies** gains the manual shadcn update process and the bundled fonts.

No backend changes.
