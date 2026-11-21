# Caddy image and CI

Status: open
Blocked by: 01
Waits on backend: none

## What to build

Package the static build as the Caddy image that meets the backend's UI contract, and set up CI and releases to match the backend's.

- Caddy image: port 8080, non-root, read-only root filesystem with a writable `/tmp`, `persist_config off`, `admin off`, `GET /healthz`, SPA fallback to `index.html`, `immutable` for `/assets/*`, `no-cache` for `index.html` and `config.json`. Base image pinned.
- `make image` and an image test that runs the container the way the chart does and checks `/healthz`, the fallback and the cache headers.
- GitHub Actions: `lint` (with actionlint), `typecheck`, `test`, `image`, `audit`, each mirroring a `make` target. Actions pinned to SHAs, Renovate weekly and grouped. Add `generated`, `contract` and `e2e` jobs in the tickets that introduce them.
- Releases: a `vX.Y.Z` tag publishes `ghcr.io/mumia/wallet-accountant-ui:vX.Y.Z` and a GitHub Release, `main` publishes `main-<sha>`, both with provenance attestation. Add the `wallet-accountant.min-api-version` label once ticket 03 pins the contract.

## Acceptance criteria

- [ ] The image test passes locally and in CI with a read-only root filesystem.
- [ ] A PR runs every job. A tag produces an image and a Release.
- [ ] The image meets `../wallet-accountant/docs/architecture/ui-contract.md` point by point.

## Spec

[spec.md](../../modern-frontend/spec.md): Serving, configuration and the dev loop; Repo conventions (CI, Releases); Testing Decisions (Image).
