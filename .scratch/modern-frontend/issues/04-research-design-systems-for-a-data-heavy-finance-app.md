# Research: design systems and component libraries for a data-heavy finance app

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: research
Status: resolved
Blocked by:

## Question

Which ready-made design systems / component libraries best suit a desktop-first, responsive personal-finance app whose core screens are dense transaction tables, review lists with bulk actions, multi-step forms (CSV mapping, statement import) and a Category tree picker?

Compare at least shadcn/ui (Radix + Tailwind), Mantine, MUI, Ant Design and React Aria Components (and any strong Vue/Svelte equivalents, in case the framework research points away from React) on:

- Data table quality (sorting, selection, virtualisation, inline editing) and tree-select components.
- Forms and inputs, especially money and date inputs, and how they pair with form libraries.
- Accessibility (WCAG level, keyboard support) and i18n / RTL readiness.
- Theming, dark mode, how distinctive vs generic the default look is.
- TypeScript quality, docs, popularity, maintenance health, agent familiarity.
- Ownership model (copied-in source like shadcn vs installed package) and what that means for a non-frontend engineer maintaining it.

Recommend the top two for [Prototype: look and feel](09-prototype-look-and-feel.md).

## Answer

Findings: `research/design-systems-for-a-data-heavy-finance-app.md` on branch `research/design-systems-for-a-data-heavy-finance-app` (not pushed).

**Top two to prototype:**
1. **shadcn/ui (Base UI + Tailwind) with TanStack Table.** Most mainstream, the stack agents know best, every table feature free, source is owned so the look can be ours. Gaps: no tree or tree-select component; virtualisation and inline editing are on us.
2. **Mantine 9 (with `mantine-datatable` or TanStack Table).** One installed package covers the tree (virtualised), tree select, money-friendly number input, date inputs, stepper and forms; least maintenance for a non-frontend owner. Gap: large-table performance needs testing; look may be generic.

The prototype should test: shadcn's Category tree picker and the cost of updating copied-in components; Mantine's table performance on large lists and how distinctive it can look.

**Ruled out:** MUI (key grid features paid, generic look); Ant Design (weakest accessibility, hard to restyle, own form system); React Aria Components (best a11y/i18n but most assembly, least agent familiarity; kept as a source of parts). Avoid `mantine-react-table` (stale since Nov 2023). If not React: PrimeVue or shadcn-vue (Vue), shadcn-svelte (Svelte). No library publishes a formal WCAG AA statement as a whole.
