# Theme system and the e2e harness

Status: open
Blocked by: 01
Waits on backend: none

## What to build

Set up the look and feel and the end-to-end test harness every later screen uses.

- shadcn/ui on Base UI (`base-nova`) with Tailwind 4. Add `make ui-add c="…"` (the pinned shadcn CLI with `--yes`, in the Node container) and the `// local:` convention.
- Presets A Ledger (default), B Teal, C Ink and D Warm as CSS tokens on `<html>`, with Light / Dark / System. Dark is the default. Every combination tuned to AA. Fonts bundled from Fontsource variable packages.
- A unit test of each theme's token contrast: 4.5:1 for text; 3:1 for controls, borders and focus rings.
- The Appearance dialog component, with live changes saved in `localStorage` and wrapped in try/catch. Ticket 07 wires it into the User menu.
- MSW in the browser: start the worker from `src/mocks/handlers.ts` when the app is built or served in mock mode (handed over from ticket 03), so dev and e2e share the test handlers.
- Playwright in its official Docker image against the built app with MSW, `@axe-core/playwright` failing on any violation, and the CI `e2e` job.
- The visual reference is `prototypes/look-and-feel/shadcn/` on branch `prototype/look-and-feel` (commit `3da18dd`). Don't copy its code.

## Acceptance criteria

- [ ] All eight theme combinations pass the contrast test.
- [ ] A Playwright test opens the app, changes the theme and passes axe.
- [ ] The theme choice survives a reload, and the app still works when storage is blocked.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 13; Look and feel; Accessibility; Testing Decisions (End-to-end).
