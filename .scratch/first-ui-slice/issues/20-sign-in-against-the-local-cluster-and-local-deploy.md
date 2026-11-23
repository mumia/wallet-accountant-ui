# Sign in against the local cluster, and make local-deploy

Status: in progress
Blocked by: 04
Waits on backend: yes. The environment repo (`wallet-accountant-deploy`) must register the dev origin (`https://localhost:5173/auth/callback` in `oidc.zitadelSetup.web.extraRedirectUris`, `https://localhost:5173/` in `extraPostLogoutRedirectUris`), and, for `make local-deploy`, take `ui.enabled` with the UI image and its base image (`caddy:2.11.9-alpine`) in `images.lock`.

## What to build

Ticket 04's last steps, which need the local cluster running and the environment-repo change above.

- Sign in from `make dev` against the local Zitadel, and call `GET /api/me` with the token. Check that the token's `aud` contains `wallet-accountant`, that a deep link survives the round trip, and that the session-ended dialog appears when the refresh token is revoked.
- `make local-deploy`, mirroring the backend's: build the image, push it to the k3d registry, and set `ui.enabled` and the tag in the environment repo's local values, so Flux rolls it out. Then sign in at `https://wallet.localhost:18443`.

## Acceptance criteria

- [ ] Signing in from `https://localhost:5173` and from the deployed image both reach `/api/me` with a 200. (The dev server's half is done; the deployed image waits on `make local-deploy`.)
- [x] A deep link survives the sign-in round trip.
- [ ] `make local-deploy` runs the image in the cluster with the chart's read-only settings.

## Spec

[spec.md](../../modern-frontend/spec.md): Serving, configuration and the dev loop; [ticket 04](04-config-sign-in-and-the-dev-proxy.md).

## Comments

- 2026-11-23: The `make local-deploy` part waits on wallet-accountant. Its `deploy/local/stage.sh` turns the chart's UI slot on only for the stand-in UI: the image repository `wallet-accountant-stand-in-ui` is fixed in the script, and `make local-push` stages the environment repo's working tree without ever writing to it. So this repo can't "set ui.enabled and the tag in the environment repo's local values" the way the ticket says. The way in that fits: `stage.sh` takes the UI image's repository as well as its tag (for example, `WALLET_ACCOUNTANT_UI_IMAGE` next to `WALLET_ACCOUNTANT_UI_TAG` in `bin/local-build.env`). This repo's `local-deploy` then builds and pushes to the k3d registry, records both, and runs wallet-accountant's `local-push` and reconcile. Decided to wait for that rather than edit the environment repo's values on every deploy.
- 2026-11-23: The environment-repo half of this ticket is on the `ui-dev-origin` branch of wallet-accountant-deploy. It registers the dev server's redirect URIs in `clusters/local/apps/wallet-accountant.yaml` and pins `caddy:2.11.9-alpine` in `images.lock` (`host-images`).
- 2026-11-23: Checked from `make dev` against the local cluster, with a throwaway Playwright check run in the Playwright image on the k3d network (not committed). Zitadel's login and back works, and the token the UI sends has `wallet-accountant` in `aud`. After redeeming a bootstrap Invitation code and creating a Household, `/api/me` answers 200 with the UI's token. A deep link (path, query and hash) survives a fresh sign-in. Revoking the refresh token at Zitadel and letting the access token lapse shows "Your session has ended" on the next API call. The UI itself never calls `/api/me`; the check called it with the token the UI holds.
- 2026-11-23: Found and fixed on this branch: `/register` said "You're signed in as <numeric subject>". Zitadel's ID token carries only `sub` unless the app asserts userinfo in it, and the setup Job doesn't. The UI now sets `loadUserInfo: true` (`src/app/session.ts`), and the page shows the email. The alternative, `idTokenUserinfoAssertion` on the `web` app, is a wallet-accountant change and isn't needed.
