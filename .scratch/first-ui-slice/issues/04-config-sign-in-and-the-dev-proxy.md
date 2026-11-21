# Config, sign-in and the dev proxy

Status: open
Blocked by: 03
Waits on backend: none for code. The environment-repo values from the handoff (redirect URIs for `web`) are needed to sign in against the local cluster.

## What to build

Sign in to Zitadel in the browser and call the API as the signed-in User.

- Fetch `/config.json` before boot and validate it with a Zod schema that strips unknown keys.
- oidc-client-ts 3.5 + react-oidc-context: authorization code with PKCE, refresh tokens in `sessionStorage`, the reserved `/auth/callback` route, background renewal. A 401 triggers one renewal and one resend. A failed renewal shows "Your session has ended — Sign in again" and returns to the same URL. A bearer-token middleware on the client.
- Dev loop: Vite on `https://localhost:5173` with the mkcert certificate, `/api` proxied to `https://wallet.localhost:18443` (or to `make run` on `http://localhost:8080` via one environment variable), and `npm run dev:config` writing a git-ignored `public/config.json` from the cluster's OIDC ConfigMap.
- `make local-deploy`, once the environment-repo change exists.
- The backend's stand-in UI (`deploy/helm/wallet-accountant/test/stand-in-ui`) is a working reference.

## Acceptance criteria

- [ ] Signing in against the local Zitadel succeeds and an authenticated API call returns data.
- [ ] A deep link survives the sign-in round trip.
- [ ] The config schema has unit tests. A bad config fails clearly at boot.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 1–2; Stack (oidc); Serving, configuration and the dev loop; Talking to the API (Session).
