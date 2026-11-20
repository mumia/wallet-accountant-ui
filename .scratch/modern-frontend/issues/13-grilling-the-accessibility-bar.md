# Grilling: the accessibility bar

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 

## Question

What accessibility level does the UI commit to, and what must the parts we build ourselves meet?

shadcn/ui on Base UI gives accessible primitives (focus, keyboard, ARIA) for what it ships. Find out what Base UI covers, then decide the target (e.g. WCAG 2.2 AA), how it is checked (jsx-a11y is already in lint; axe in component or e2e tests?), and the keyboard and screen-reader behaviour of our own parts: the Category tree picker, the money input, bulk row selection in tables, and the four theme presets' contrast in light and dark.

## Answer

Decided with the user on 2026-11-20, on facts checked the same day against base-ui.com, the Base UI and cmdk issue trackers, ui.shadcn.com and the npm registry (Base UI is now `@base-ui/react` 1.9).

**Target: WCAG 2.2 AA**, stated as a target, not a certified claim (neither Base UI nor shadcn publishes a conformance level). The Export balance typed twice ([Grilling: exact money in the browser](06-grilling-exact-money-in-the-browser.md)) is a deliberate confirmation, which 3.3.7 Redundant Entry allows.

**What Base UI covers, and what is ours.** Base UI gives ARIA roles, APG keyboard patterns and focus management (Dialog traps focus and returns it; Toast has an F6 landmark). It leaves to the app: visible focus styles, colour contrast, accessible names for custom controls, and reduced motion. Known open Base UI bugs to work around and test: Combobox input loses its name while open ([#6275](https://github.com/mui/base-ui/issues/6275)), high-priority Toast puts `aria-hidden` on a focusable element ([#5659](https://github.com/mui/base-ui/issues/5659)), modal Dialog leaves `aria-live` content exposed ([#6284](https://github.com/mui/base-ui/issues/6284)). Every Dialog renders `Dialog.Title`, `Dialog.Description` and a visible close.

**How it is checked**, each with a narrow job:
- **Lint:** `eslint-plugin-jsx-a11y` with its `strict` flat config. It supports ESLint only up to 9, so **ESLint is pinned to 9** until jsx-a11y supports 10 ([#1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075)). This amends [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md).
- **E2e (the main gate):** `@axe-core/playwright`, one scan per screen and state (dialog open, errors shown), on every PR, failing on any violation.
- **Component tests:** our own parts are driven by keyboard and by role with Testing Library. No axe in jsdom (`vitest-axe` is stale; jsdom can't check contrast).
- **Theme token test:** a unit test computes the contrast of each theme's token pairs (text 4.5:1; controls, borders and focus rings 3:1).
- **Manual, before each release:** keyboard only plus VoiceOver over the key flows, from a short checklist in the conventions doc.

**Themes: all eight meet AA, each tuned on its own.** The presets (A Ledger, B Teal, C Ink, D Warm) × light/dark differ too much to share or derive tokens, so each of the eight has its own token profile, tuned from the prototype's colours until it passes. None is dropped; if tuning visibly changes a preset's character, the user looks at it before launch.

**Bulk row selection** (To review, Transactions): plain checkboxes, not an ARIA grid.
- Each row's checkbox is labelled from the row ("Select 12 Mar, Albert Heijn, −23.40 EUR"); shadcn's recipe labels every row "Select row", so the recipe is changed.
- The header checkbox selects all on the page, with a mixed state when some are selected. Tab moves, Space toggles; Shift+click selects a range.
- The bulk-action bar appears with a polite live announcement ("3 selected").
- Any keyboard shortcuts (decided in the To review ticket) use a modifier or can be turned off (2.1.4).

**Money input** (ours, per ticket 06):
- A visible `<label>`; the currency is in the label or a visible suffix linked by `aria-describedby`, never a placeholder.
- The inline error ("EUR has 2 decimal places") is linked by `aria-describedby`, sets `aria-invalid`, and is announced when it appears.
- Formatting happens on blur only and never moves the caret while typing.
- The Export balance confirm field says what it matches ("Repeat the Export balance") and reports a mismatch like any other error.

**Category tree picker: Base UI Combobox with groups**, not cmdk (last released March 2025, open `aria-activedescendant` bugs [#413](https://github.com/dip/cmdk/issues/413), [#373](https://github.com/dip/cmdk/issues/373)) and not a real ARIA tree. Parent Categories are `Combobox.GroupLabel`s, children indented options, and typing searches the full path ("Food › Groceries"). Whether a parent Category itself can be picked is left to [Grilling: the To review list](14-grilling-the-to-review-list.md). This replaces the prototype's Popover + Command.

**Motion, zoom and colour:**
- Transitions honour `prefers-reduced-motion` (Tailwind `motion-safe:`).
- Layouts hold at 200% zoom and reflow at 320 px wide (1.4.10); wide tables scroll inside their own box.
- Colour is never the only cue: differences and mismatches also carry text or an icon.
- 2.2 specifics: focus is never fully hidden by the sticky header or toasts (2.4.11); targets are at least 24×24 px, including icon buttons in comfortable-density tables (2.5.8); sign-in works with paste and password managers (3.3.8, mostly Zitadel's hosted page).

No backend changes.

## Comments

**2026-11-20, from [Grilling: the To review list](14-grilling-the-to-review-list.md):** a parent Category can be picked, so the Category picker no longer uses parent Categories as group labels. Every Category is an indented option, searchable by full path, grouped by kind (Uncategorised first, then Expense, then Income); other Internal Categories are hidden.
