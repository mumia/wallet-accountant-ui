# Caddy image and CI

Status: done
Blocked by: 01
Waits on backend: none

## What to build

Package the static build as the Caddy image that meets the backend's UI contract, and set up CI and releases to match the backend's.

- Caddy image: port 8080, non-root, read-only root filesystem with a writable `/tmp`, `persist_config off`, `admin off`, `GET /healthz`, SPA fallback to `index.html`, `immutable` for `/assets/*`, `no-cache` for `index.html` and `config.json`. Base image pinned.
- `make image` and an image test that runs the container the way the chart does and checks `/healthz`, the fallback and the cache headers.
- GitHub Actions: `lint` (with actionlint), `typecheck`, `test`, `image`, `audit`, each mirroring a `make` target. Actions pinned to SHAs, Renovate weekly and grouped. Add `generated`, `contract` and `e2e` jobs in the tickets that introduce them.
- Releases: a `vX.Y.Z` tag publishes `ghcr.io/mumia/wallet-accountant-ui:vX.Y.Z` and a GitHub Release, `main` publishes `main-<sha>`, both with provenance attestation. Add the `wallet-accountant.min-api-version` label once ticket 03 pins the contract.

## Acceptance criteria

- [x] The image test passes locally (in CI once the PR runs) with a read-only root filesystem.
- [ ] A PR runs every job. A tag produces an image and a Release.
- [x] The image meets `../wallet-accountant/docs/architecture/ui-contract.md` point by point.

## Spec

[spec.md](../../modern-frontend/spec.md): Serving, configuration and the dev loop; Repo conventions (CI, Releases); Testing Decisions (Image).

## Answer

Landed on 2026-11-21.

- **Image**: a `Dockerfile` that builds in the Node image from `.node-version` (a build arg, so the version isn't written twice) and serves from `caddy:2.11.9-alpine` with `docker/Caddyfile`. It runs as uid 10001 with `XDG_*` under `/tmp`. The Caddy binary's `cap_net_bind_service` is removed, because the chart drops every capability.
- **The image ships no `config.json`**: without the chart's mount, `/config.json` is a 404 rather than a made-up config.
- **Missing assets**: `/assets/*` 404s for a missing file instead of falling back to `index.html`, as the backend's stand-in UI does. That keeps an HTML page from being cached as a script for a year.
- **`docker/test-image.sh`** runs the image the way `templates/ui.yaml` does (`--read-only`, tmpfs `/tmp`, `--cap-drop ALL`, `no-new-privileges`, `config.json` mounted) and checks the uid, `/healthz`, `/`, a deep link, `config.json`, an asset's immutable caching, and the missing-asset 404. It passes on our image, and it fails on stock Caddy, which runs as root.
- **CI** (`ci.yaml`) has the jobs `lint` (with actionlint), `typecheck`, `test`, `image` and `audit`, with Actions pinned to SHAs as in the backend.
- **Releases** (`release.yaml`) copy the backend's: tag checks (semver, annotated, in `main`), a `linux/amd64` image, an attestation, plus the backend's keyless cosign signature, and a GitHub Release. The `min-api-version` label waits for ticket 03.
- **Renovate**: `renovate.json` validated with `renovate-config-validator`. It holds ESLint below 10, TypeScript below 7, and `@types/node` on the Node major.
- **Make**: `make check` now covers everything CI runs: actionlint, the audit and the image test, on top of lint, typecheck, test and build.
- **Not verified yet**: CI on a real PR, and a tag release. Merging to `main` publishes the first `main-<sha>` image and creates the GHCR package, which is private until made public once.
