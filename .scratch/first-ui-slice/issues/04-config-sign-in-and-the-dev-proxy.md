# Config, sign-in and the dev proxy

Status: done
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

- [ ] Signing in against the local Zitadel succeeds and an authenticated API call returns data. **Moved to ticket 20**: the cluster wasn't running, and the environment repo doesn't register the dev origin yet.
- [x] A deep link survives the sign-in round trip (tested up to Zitadel: the gate sends the current path as state, and the callback returns to it; the full round trip is ticket 20).
- [x] The config schema has unit tests. A bad config fails clearly at boot.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 1–2; Stack (oidc); Serving, configuration and the dev loop; Talking to the API (Session).

## Answer

Landed on 2026-11-21, except the parts that need the local cluster, moved to [Sign in against the local cluster, and make local-deploy](20-sign-in-against-the-local-cluster-and-local-deploy.md).

- **Boot** (`src/app/boot.tsx`): messages, then the browser check, then `/config.json`, then the app. A missing, non-JSON or wrong config shows "Wallet Accountant can't start" with the Zod details. The schema drops unknown keys at every level, requires paths to start with `/`, and requires an http(s) issuer. Tested with MSW, including the SPA fallback answering HTML instead of JSON.
- **The API client is now made at boot.** `createApi({ baseUrl, auth })` is built from the config, and screens use `useApi()`. This replaces ticket 03's module-level client, so `apiBaseUrl` really comes from `/config.json`.
- **Sign-in**: oidc-client-ts 3.5.0 + react-oidc-context 3.3.1, as the spec said.
  - `SignInGate` sends a signed-out User to Zitadel with the current page as state. `/auth/callback` is a reserved route, and `returnPath` accepts only same-origin paths, so the state can't redirect elsewhere.
  - The scopes add `email` to the stand-in UI's set, for `/register`'s "signed in as".
  - The config's `audience` is validated but not sent: the backend's stand-in UI showed that Zitadel already puts the API's audience in `web` tokens.
- **401 handling** (`src/api/auth.ts`): one renewal and one resend; concurrent 401s share one renewal, because refresh tokens rotate. A failed renewal, or a renewed token that is refused too, raises the session-ended signal, which a background renewal error also raises. A resent write keeps its body and Idempotency-Key. Each case has an MSW test.
- **Session ended**: a native `<dialog>` with a title, a description, "Sign in again" (back to the same page) and a visible "Not now" close. Ticket 05's Base UI dialog may replace it. jsdom lacks `showModal`, so the test setup adds it.
- **TanStack Router redirects**: ESLint's `only-throw-error` allows them, since they are thrown by design, rather than an `eslint-disable` in a route.
- **The dev loop**:
  - `make dev-cert` (mkcert) gives `https://localhost:5173`.
  - `make dev` forwards `/api` to the cluster through `host-gateway` with the mkcert CA trusted, or to `make run` with `API_PROXY_TARGET=http://host.docker.internal:8080`. Checked both: HTTPS verified against the mkcert CA, a deep link answers 200, `/config.json` is served, the cluster target was refused only because the cluster was down, and a stand-in server on the host's port 8080 answered through the proxy.
  - `make dev-config` replaces the spec's `npm run dev:config`, because `kubectl` runs on the Mac, not in the Node container.
- `make check` passes, with 95 tests.
