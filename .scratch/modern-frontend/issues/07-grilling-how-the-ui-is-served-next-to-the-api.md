# Grilling: how the UI is served next to the API

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 03

## Question

How is the static UI served alongside the API, in self-hosting (Compose) and in local development?

Options include: the Go binary embedding and serving the built UI (same origin, one image); a separate static container (e.g. Caddy or nginx) that also reverse-proxies `/api` (same origin, two images); or a separate origin with CORS enabled in the backend. Decide which, what it means for releases and versioning across the two repos, how the UI learns its runtime config (API base URL, Zitadel issuer and client ID) without rebuilding, and how local dev runs (Vite dev server proxying to `make run` on :8080). List every backend change this implies.

## Answer

Decided with the user on 2026-11-19. Midway through, the backend had already settled most of this ticket, so the session was re-evaluated against:
- `../wallet-accountant/docs/architecture/ui-contract.md`, the **UI contract**, which binds the UI image
- ADR-0019: Kubernetes replaces Compose, and local runs the production definitions
- ADR-0020: Helm chart, GitOps environment repo `wallet-accountant-deploy`, Flux
- ADR-0021: the API is served under `/api`, on the same origin as the UI
- ADR-0022: Zitadel is a platform IdP, and the chart's setup Job creates the `web` app with 15-minute tokens

### Settled by the backend (the UI follows)

- **Topology:** Kubernetes everywhere (k3s in production, k3d locally); Compose is gone. The chart's Gateway API `HTTPRoute` sends `/api` and `/api/*` to the app and every other path to the UI image, on one origin. No CORS, and no proxy inside the UI image.
- **Prefix:** the API itself serves `/api` and the contract's `servers` is `/api`. There is no `v1`, and nothing strips the prefix. Options considered and dropped during the session: stripping `/api` at a proxy (Zalando-pure) and `/api/v1` (Zalando advises against URL versioning).
- **What the UI image must do** (per the UI contract):
  - serve static files on port 8080, as non-root, with a read-only root filesystem and no writable volume
  - answer `GET /healthz`
  - fall back to `index.html` for any path that isn't a file
  - send `immutable` caching for `/assets/*`, and `no-cache` for `index.html` and `config.json`
  - run no Node at runtime
- **Runtime config:** the UI fetches `/config.json` before starting, in the shape the contract fixes (`apiBaseUrl`, `oidc.{issuer, clientId, audience, redirectPath, postLogoutRedirectPath}`).
  - The chart mounts it at `/srv/config.json` from a ConfigMap.
  - The UI's Zod schema **strips unknown keys** rather than rejecting them, as the contract requires.
  - `/auth/callback` is a reserved UI route.
- **Sign-in:** the chart's Zitadel setup Job creates the `web` app (public, PKCE, refresh tokens, 15-minute access tokens).
- **Releases:** the UI image is versioned and released on its own, published to GHCR. The chart pins its tag, and the environment repo bumps it.
  - If GHCR ever charges for public images, the fallback is Docker Hub or Quay. Only the image name changes.

### Decided here

- **Static server: Caddy**, configured with `persist_config off` and `admin off` so it writes nothing.
  - The UI's CI runs the built image the way the chart does (`--read-only`, non-root, no writable mounts).
  - It then checks `/healthz`, the `index.html` fallback and the cache headers.
- **Dev loop:**
  - **Vite:** runs on `https://localhost:5173` with the mkcert certificate already trusted by `make local-ca`. HTTPS means Zitadel's development mode isn't needed.
  - **`/api`:** Vite forwards it unchanged to the in-cluster app at `https://wallet.localhost:18443` by default. One environment variable switches the target to `make run` on `http://localhost:8080`.
  - **Config:** `npm run dev:config` reads the cluster's OIDC ConfigMap with `kubectl` and writes a git-ignored `public/config.json`.
- **Full-fidelity local check:** a UI `make local-deploy`, mirroring the backend's.
  - It builds the image and pushes it to the k3d registry.
  - It sets `ui.enabled: true` and the tag in the environment repo's local values, and Flux rolls it out.
  - The image's base image must be on the environment repo's pinned list (`images.lock`), so the local cluster works offline.
- **Contract version:**
  - **Pin:** the UI pins `openapi.yaml` to a **backend release tag**, not a bare SHA.
  - **Release:** the release workflow writes that tag into the release notes and onto the image as the label `wallet-accountant.min-api-version` ("the lowest API contract version it needs").
  - **Runtime:** no version check.

## Backend changes

- **Environment repo `wallet-accountant-deploy`, local values:**
  - Add `https://localhost:5173/auth/callback` to `oidc.zitadelSetup.web.extraRedirectUris`, and `https://localhost:5173/` to `extraPostLogoutRedirectUris`, for the Vite dev server.
  - Set `ui.enabled: true` with the UI image once it exists.
  - Add the UI image's base image to `images.lock`.
- Nothing in the Go API or the chart: the chart's UI slot already exists.
