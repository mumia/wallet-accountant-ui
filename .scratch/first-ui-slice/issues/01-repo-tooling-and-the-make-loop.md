# Repo tooling and the Make loop

Status: open
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

- [ ] A fresh clone with only Docker and Make passes `make check`.
- [ ] `make dev` serves the page with hot reload.
- [ ] A literal string in JSX, an `any` or a non-null `!` fails lint.
- [ ] `docs/architecture/conventions.md` exists and matches the spec.

## Spec

[spec.md](../../modern-frontend/spec.md): Stack, Repo conventions, Testing Decisions (Unit).
