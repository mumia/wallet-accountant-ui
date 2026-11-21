# Theme system and the e2e harness

Status: done
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

- [x] All eight theme combinations pass the contrast test.
- [x] A Playwright test opens the app, changes the theme and passes axe.
- [x] The theme choice survives a reload, and the app still works when storage is blocked.

## Spec

[spec.md](../../modern-frontend/spec.md): user story 13; Look and feel; Accessibility; Testing Decisions (End-to-end).

## Answer

Landed on 2026-11-21.

- **shadcn/ui**: `make ui-add c="…"` runs the pinned CLI (4.23.0) with `--yes` and no terminal, and it works. Two surprises:
  - The CLI reads the `@/` alias from the root `tsconfig.json`, not from `tsconfig.app.json`, so the alias is in both.
  - **The registry's parts now import `cn` from shadcn's own npm package `cn`** (published by shadcn, repository `shadcn-ui/cn`), which replaces `clsx` and `tailwind-merge`. I followed upstream: there's no `lib/utils.ts`, and `clsx` and `tailwind-merge` are gone.
- **Parts so far**: button, dialog, radio-group and label. There are three `// local:` changes:
  - `dialog.tsx`: the close button's name comes from the message files, in the content's X and in the footer.
  - `label.tsx`: a reasoned `eslint-disable` for jsx-a11y on the generic wrapper.
  - **Prettier skips `components/ui/`**, so an `--overwrite` update shows only real changes.
- **Themes**: eight token profiles in `src/lib/theme/themes.ts`, applied by JS on `<html>`, so the contrast test reads exactly what the browser uses.
  - **The contrast maths** (`contrast.ts`, oklch to sRGB to WCAG) was checked against known values: neutral-500 on white is 4.73 against a published 4.74.
  - **The contrast test** covers every profile: 17 text pairs at 4.5:1, 8 control pairs at 3:1, and destructive text on its tinted button. All pass.
  - **Tuning darkened four tokens compared with the prototype**:
    - muted text: L 0.556 → 0.5 light, 0.708 → 0.74 dark;
    - **input and radio edges**: L 0.922 → 0.6 light, 10% white → L 0.55 dark. These are the most visible change: field borders are clearly darker than shadcn's default;
    - destructive red in light: L 0.577 → 0.5, plus the dark and positive colours;
    - the teal, ink and warm light accents, slightly.
  - `border` stays decorative and exempt. **Per the spec, the user should look at the presets** for a changed character, mainly the input edges.
- **The Appearance dialog** (`components/appearance-dialog.tsx`): a radio group of four swatches and Light / Dark / System, applied live and saved through a guarded `localStorage`. Until ticket 07's User menu, the placeholder welcome page opens it.
- **Fonts**: the four Fontsource variable packages, bundled into `/assets`.
- **Reduced motion**: a global CSS rule.
- **Mock mode**: MSW in the browser serves `/config.json` and the handlers, and a seeded oidc-client-ts User stands in for sign-in. A Vite plugin serves and emits MSW's worker in mock mode only.
  - **Checked**: the production `dist/` has no MSW code and no worker file.
- **e2e**: Playwright 1.65.1 in `mcr.microsoft.com/playwright:v1.65.1-noble`. The version is read from `package.json` by Make and CI, so the image and the package can't drift. There are 12 tests:
  - the default theme;
  - a live change surviving a reload;
  - System following the OS;
  - storage refusing the app's data;
  - axe on all eight themes, with and without the dialog open.
  - The CI `e2e` job uploads the report on failure.
- **A real bug found by the storage test**: oidc-client-ts keeps the sign-in state (the PKCE verifier) in `localStorage` by default, so with storage blocked the app never started. It's now in `sessionStorage` (`src/app/session.ts`).
  - **Checked by hand**: the production build with `localStorage` throwing on any access starts, applies the theme and reaches the sign-in screen, with no page errors.
  - **Test limit**: MSW itself reads `localStorage` unguarded, so the e2e test refuses only the app's keys. The fully blocked case is unit-tested.
- **The session-ended dialog** now uses the shared Dialog, and jsdom's `showModal` stand-in is gone.
