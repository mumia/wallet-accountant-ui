# Prototype: look and feel

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: prototype
Status: resolved
Blocked by: 04, 05, 08

## Question

Which design system, and which theme on top of it (colour, density, typography, light / dark), feels right for Wallet Accountant?

Build rough, clickable, throwaway versions of two key screens (the Imported transaction review list with Accept / Keep / Discard, and the Statement import flow) in each of the top two design systems from the research, on the chosen stack, with fake data. The user reacts and picks.

Note from [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md): build the two screens inside the decided shell (left sidebar with Household switcher, Accounts, Categories, Notifications bell), as the Account's **To review** tab and the `statement-imports/new` page.

## Answer

Decided with the user on 2026-11-20, after clicking through the prototype (`prototypes/look-and-feel/` on branch `prototype/look-and-feel`, commit `3da18dd`).

- **Design system: shadcn/ui** on Base UI (the `base-nova` style) with Tailwind 4 and **TanStack Table**. Mantine is not used, so `mantine-datatable` is moot.
- **Theme: preset A "Ledger" in dark is the default**: neutral greys, Inter, small radius. The other presets (B Teal, C Ink, D Warm) and light stay available as a User-facing setting, built as shadcn CSS tokens switched on `<html>`, as in the prototype.
- **Saved in the browser** (localStorage) at launch, so a new device starts at A + dark. Syncing the choice across devices through the backend is later work, outside this effort.
- **Density: comfortable** only. The compact knob was a prototype control, not a setting.
- **Screens:** the To review tab and the Statement import flow as prototyped felt right. Their detail stays with the flow work in the map's fog.

Consequences for other tickets:

- **Category tree picker** is ours to build: shadcn has no tree-select. The prototype's Popover + Command (cmdk) with indented groups is a fair start.
- **Long lists** need virtualisation (TanStack Virtual, already in the stack) or paging; 2000 plain rows took seconds even in shadcn.
- For [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md): how shadcn components are added and updated (`npx shadcn add` hung in Docker; the prototype used a small fetch script), the TanStack Table major version (v8 in the prototype, v9 is out), and whether the four preset fonts are bundled with the app or loaded from Google Fonts.

No backend changes.

## Comments

**2026-11-20, prototype built, waiting for the user's reaction.** Code: `prototypes/look-and-feel/` on branch `prototype/look-and-feel` (commit `3da18dd`, not pushed; README there says how to run it with Docker and what to try). Two apps, same fake data, shell and routes: shadcn/ui (Base UI, base-nova) + TanStack Table on :5173, Mantine 9 + mantine-datatable + TreeSelect on :5174. A floating bar switches four theme presets (A Ledger, B Teal, C Ink, D Warm), light/dark, density, and a 2000-row stress test.

Observations so far (agent, before the user's reaction):

- **Category picker.** shadcn has no tree-select; Popover + Command (cmdk) with indented groups works and is searchable. Mantine's `TreeSelect` is a real tree with expand/collapse.
- **Large lists.** 2000 live Mantine `TreeSelect`s (one per row) froze the page; the Mantine picker is now a plain button that becomes a `TreeSelect` on click. Even then, rendering 2000 unvirtualised rows took ~36 s in Mantine vs ~16 s in shadcn (dev build, headless container; the ratio matters, not the numbers), and selecting a row ~17 s vs ~5 s. Neither is usable at 2000 rows: virtualisation or paging is needed either way (fog: how cursor pagination appears).
- **Tooling.** `npx shadcn add` hangs in Docker at "Checking registry"; components were fetched from the registry with a small script. Mantine is plain `npm install`.
- **Mantine `createLink`** needs a small non-polymorphic wrapper per component to be typed; shadcn uses `render={<Link/>}` (plus `nativeButton={false}` on Buttons).
