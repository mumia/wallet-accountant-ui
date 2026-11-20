# Grilling: repo conventions and tooling

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 05

## Question

On the chosen stack (see [Grilling: choose the application stack](05-grilling-choose-the-application-stack.md)), what are this repo's conventions and tooling?

Decide: package manager and Node version pinning; the strict `tsconfig` (which flags beyond `strict`, e.g. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); lint and format (typescript-eslint strict-type-checked + Prettier, or Biome, given TS 6); the test approach at each level (unit, component, end-to-end) and how the API is mocked (e.g. Vitest, Testing Library, Playwright, MSW driven by the OpenAPI types); CI (what runs on a PR, including the contract-drift and generated-types checks); the folder layout (by feature vs by layer, where generated API code lives); and the outline of a conventions doc in the spirit of the backend's `docs/architecture/conventions.md`.

Note from [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md): CI must also build the Caddy image and test it against the backend's UI contract (read-only, non-root, `/healthz`, SPA fallback, cache headers), and the contract is pinned to a backend release tag.

## Answer

Decided with the user on 2026-11-20, on the stack from [Grilling: choose the application stack](05-grilling-choose-the-application-stack.md) and the serving decisions in [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md).

### Package manager, Node and commands

- **npm**. Commit `package-lock.json`, and use `npm ci` in CI and Docker. Set `save-exact=true` in `.npmrc` so every dependency is pinned exactly.
- **Node runs only in Docker.** It is never installed on the developer's machine.
  - The version is the **current Node Active LTS** (26 at the time of writing; confirm when pinning).
  - Its one source of truth is `.node-version`. The Makefile reads it for the `node:<ver>` image tag, `package.json` `engines` mirrors it, and Renovate updates it.
- **Make is the only entry point.**
  - Each target runs `docker run --rm -v $PWD:/app -w /app node:<ver>` and calls an npm script inside.
  - The npm scripts hold the real definitions, so CI calls them directly.
  - `node_modules` lives in a named Docker volume, so Linux packages never mix with the host's.
  - `make check` runs every CI check locally.
- **No git hooks.** CI enforces the checks.

### TypeScript

- `strict`, plus:
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
  - `noImplicitOverride`
  - `noFallthroughCasesInSwitch`
  - `noPropertyAccessFromIndexSignature`
  - `verbatimModuleSyntax`
  - `erasableSyntaxOnly`, so no `enum` and no `namespace`
- `noUnusedLocals` and `noUnusedParameters` stay off: the linter reports unused code, so half-written code doesn't block a build.
- If a library makes a flag unworkable, turn off that one flag and record why in the conventions doc.

### Lint and format

- **ESLint** with typescript-eslint `strict-type-checked` + `stylistic-type-checked`, plus **Prettier**.
- Plugins:
  - `react-hooks`
  - `jsx-a11y`
  - `@tanstack/eslint-plugin-query`
  - `@tanstack/eslint-plugin-router`
  - `i18next/no-literal-string` for JSX text
  - `import/no-extraneous-dependencies`, which makes up for npm not being strict about imports
  - `eslint-plugin-boundaries`, which keeps features from importing each other's internals (the role depguard plays in the backend)
- `any` and non-null `!` are banned. Zero warnings are allowed (`--max-warnings 0`).
- **shadcn/ui parts** in `components/ui/` are held to the same rules: fix them when they are added. `eslint-disable` lines are allowed there only, each with a reason.
- **Generated files** (`schema.gen.ts`, `routeTree.gen.ts`) are excluded from lint and format.

### Folder layout: by feature, with file-based routes

```
src/
  main.tsx, app/        boot: fetch /config.json, OIDC, Query client, i18n, router
  routes/               TanStack Router file routes (thin; generated routeTree.gen.ts)
  features/<area>/      one per backend bounded context or screen area (households, accounts,
                        categories, statement-imports, month-close, notifications…)
  components/ui/        shadcn/ui generated parts (ours to edit)
  components/           shared parts we build: money input, Category tree picker, data table
  api/                  openapi.yaml (pinned copy), schema.gen.ts, client.ts (+ JSON money reviver)
  lib/                  Intl formatting of money and dates, problem+json helpers, …
  locales/en/*.json     message files, one namespace per feature
```

### Tests

- **Unit and component tests**: Vitest + Testing Library in jsdom.
- **Pure logic** gets plain unit tests: money parsing and formatting, CSV mapping rules, Zod schemas.
- **API mocking**: MSW at the network level, never mocking the client or the hooks. Handlers are typed from the generated OpenAPI types with **openapi-msw**, so a mock that drifts from the contract is a type error. The same handlers serve the browser in dev and e2e.
- **End-to-end tests**: Playwright in its official Docker image, against the built app with MSW, on every PR.
- **A real-stack smoke** (sign in, import a statement, close a month, on the local k3d cluster) comes later. It is specified when the build effort reaches it, and runs locally or nightly like the backend's `smoke.yaml`.
- No coverage threshold.

### CI (GitHub Actions; Actions pinned to SHAs; Renovate weekly, grouped)

On every PR and on pushes to `main`. Each job mirrors a `make` target.

| Job | What |
|---|---|
| `lint` | ESLint, Prettier check, actionlint |
| `typecheck` | `tsc --noEmit` |
| `generated` | regenerate API types and the route tree from the pinned contract, then `git diff --exit-code` |
| `contract` | the committed `openapi.yaml` equals the file at the pinned backend release tag |
| `test` | Vitest |
| `e2e` | Playwright with MSW |
| `image` | build the Caddy image, run it `--read-only` as non-root, then check `/healthz`, the SPA fallback and the cache headers per the UI contract |
| `audit` | `npm audit --omit=dev`, high severity |

### Releases

The scheme copies the backend's:
- a `vX.Y.Z` tag publishes `ghcr.io/mumia/wallet-accountant-ui:vX.Y.Z` with a GitHub Release
- a push to `main` publishes `main-<sha>`
- every image gets a provenance attestation and the `wallet-accountant.min-api-version` label

### ADRs

Two ADRs go into this repo's `docs/adr/` when the handoff is assembled, not now:
- **Application stack**, from ticket 05
- **Exact money in the browser**, from ticket 06

Everything else is convention.

### Outline of `docs/architecture/conventions.md` (written in the build effort)

1. **Layout**: the tree above, plus the boundaries rule
2. **Commands**: Docker-only Node, Make targets, `.node-version`
3. **TypeScript**: flags and the exception process
4. **Lint and format**, including the shadcn/ui and generated-file rules
5. **API client**: pinned contract, regeneration, the money reviver, problem+json
6. **Strings and formatting**: message files, `Intl`
7. **Testing**: levels, MSW and openapi-msw
8. **CI**: the job table
9. **Releases**: tags, image, label, provenance
10. **Dependencies**: exact pins, Renovate

No backend changes.
