# Grilling: repo conventions and tooling

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 05

## Question

On the chosen stack (see [Grilling: choose the application stack](05-grilling-choose-the-application-stack.md)), what are this repo's conventions and tooling?

Decide: package manager and Node version pinning; the strict `tsconfig` (which flags beyond `strict`, e.g. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); lint and format (typescript-eslint strict-type-checked + Prettier, or Biome, given TS 6); the test approach at each level (unit, component, end-to-end) and how the API is mocked (e.g. Vitest, Testing Library, Playwright, MSW driven by the OpenAPI types); CI (what runs on a PR, including the contract-drift and generated-types checks); the folder layout (by feature vs by layer, where generated API code lives); and the outline of a conventions doc in the spirit of the backend's `docs/architecture/conventions.md`.

Note from [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md): CI must also build the Caddy image and test it against the backend's UI contract (read-only, non-root, `/healthz`, SPA fallback, cache headers), and the contract is pinned to a backend release tag.
