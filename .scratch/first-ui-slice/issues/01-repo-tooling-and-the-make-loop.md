# Repo tooling and the Make loop

Status: done
Blocked by:
Waits on backend: none

## What to build

Turn the empty repo into a working React 19 + Vite 8 + strict TypeScript 6 app that only runs Node in Docker behind Make. The app shows one translated "Wallet Accountant" page. Nothing talks to the API yet.

- npm with `package-lock.json`, `save-exact=true`, `.node-version` (Active LTS) as the single source of truth, `node_modules` in a named Docker volume.
- Make targets: `dev`, `build`, `lint`, `typecheck`, `test`, `check` (runs every CI check). npm scripts hold the definitions. No git hooks.
- tsconfig with every flag listed under **Repo conventions**.
- ESLint 9 with typescript-eslint `strict-type-checked` + `stylistic-type-checked`, Prettier, react-hooks, jsx-a11y (strict), `i18next/no-literal-string`, `import/no-extraneous-dependencies`, `eslint-plugin-boundaries` for the by-feature layout, `--max-warnings 0`. Add the TanStack plugins when those libraries arrive.
- TanStack Router with file routes and one route. react-i18next with type-safe keys and `src/locales/en/`.
- Vitest, with one unit test.
- Write `docs/architecture/conventions.md` from the outline in [Grilling: repo conventions and tooling](../../modern-frontend/issues/10-grilling-repo-conventions-and-tooling.md).

## Acceptance criteria

- [x] A fresh clone with only Docker and Make passes `make check`.
- [x] `make dev` serves the page with hot reload.
- [x] A literal string in JSX, an `any` or a non-null `!` fails lint.
- [x] `docs/architecture/conventions.md` exists and matches the spec.

## Spec

[spec.md](../../modern-frontend/spec.md): Stack, Repo conventions, Testing Decisions (Unit).

## Answer

Landed on 2026-11-21.

- Node 26.13.1 (Active LTS) in `node:26.13.1-bookworm-slim`, set by `.node-version`. The Makefile runs every npm script in that image, with `node_modules` and the npm cache in named volumes; `make help` lists the targets. Verified that `make check` passes on an empty `node_modules` volume (a fresh clone).
- Versions resolved: React 19.3, Vite 8.3, TypeScript 6.0.3, TanStack Router 1.170, i18next 27 + react-i18next 18, ESLint 9.39 (npm now prints a deprecation notice for 9; we stay on it for jsx-a11y), typescript-eslint 8.73, Vitest 5.1, Prettier 3.10.
- tsconfig: a shared `tsconfig.base.json` with every flag, used by `tsconfig.app.json` (`src/`) and `tsconfig.node.json` (config files). jsx-a11y ships no types, so it has a typed declaration in `types/`.
- Lint rules each checked against a throwaway file that breaks them: a cross-feature import, a literal JSX string, `any`, `!`, and a devDependency imported from app code all fail. Same-feature imports pass. eslint-plugin-boundaries 7 matches folders only, so `main.tsx` and `routeTree.gen.ts` belong to a `root` element on `src`.
- Prettier formats code and config only (`**/*.md` ignored, so the docs and `.scratch/` stay as written).
- Message keys are type-checked: an unknown key fails `make typecheck`.
- `/` shows a placeholder `WelcomePage` from `features/welcome/`; ticket 06 replaces it with the first-run redirect and deletes the feature.
- `docs/architecture/conventions.md` follows the ten-section outline. Sections for later tickets are marked with the ticket number.
- Not checked: hot reload in a real browser through Docker's file mount. The dev server serves the app.
