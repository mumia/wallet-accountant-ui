# Sign in against the local cluster, and make local-deploy

Status: open
Blocked by: 04
Waits on backend: yes. The environment repo (`wallet-accountant-deploy`) must register the dev origin (`https://localhost:5173/auth/callback` in `oidc.zitadelSetup.web.extraRedirectUris`, `https://localhost:5173/` in `extraPostLogoutRedirectUris`), and, for `make local-deploy`, take `ui.enabled` with the UI image and its base image (`caddy:2.11.9-alpine`) in `images.lock`.

## What to build

Ticket 04's last steps, which need the local cluster running and the environment-repo change above.

- Sign in from `make dev` against the local Zitadel, and call `GET /api/me` with the token. Check that the token's `aud` contains `wallet-accountant`, that a deep link survives the round trip, and that the session-ended dialog appears when the refresh token is revoked.
- `make local-deploy`, mirroring the backend's: build the image, push it to the k3d registry, and set `ui.enabled` and the tag in the environment repo's local values, so Flux rolls it out. Then sign in at `https://wallet.localhost:18443`.

## Acceptance criteria

- [ ] Signing in from `https://localhost:5173` and from the deployed image both reach `/api/me` with a 200.
- [ ] A deep link survives the sign-in round trip.
- [ ] `make local-deploy` runs the image in the cluster with the chart's read-only settings.

## Spec

[spec.md](../../modern-frontend/spec.md): Serving, configuration and the dev loop; [ticket 04](04-config-sign-in-and-the-dev-proxy.md).
