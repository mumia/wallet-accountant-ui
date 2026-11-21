# Research: signing in to Zitadel from a browser app

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: research
Status: resolved
Blocked by:

## Question

How should a static single-page app sign users in to Zitadel and call the API with a bearer token (backend ADR-0010), securely and with the least moving parts?

Cover:

- The Zitadel application type and settings for a browser client (user agent vs native, PKCE, redirect and post-logout URIs, refresh tokens, token lifetimes), and how `../wallet-accountant/deploy/zitadel/setup-project.sh` would create it next to the existing `api-clients` app.
- Browser OIDC libraries (e.g. oidc-client-ts, react-oidc-context, Zitadel's own SDKs): maturity, TypeScript types, silent renew vs refresh tokens.
- Where tokens live (memory, sessionStorage, localStorage) and the current security guidance (OAuth 2.0 for Browser-Based Apps BCP), including whether a backend-for-frontend is warranted for this app or overkill given the static-build constraint.
- What same-origin vs cross-origin serving changes for auth (CORS, cookies, redirect URIs).
- The dev setup: dev server URL, Zitadel at http://localhost:8081.

Findings feed [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md). Note any backend changes the findings imply.

## Answer

Findings: `research/signing-in-to-zitadel-from-a-browser-app.md` on branch `research/signing-in-to-zitadel-from-a-browser-app` (not pushed). Nothing was tested against a running Zitadel.

**Recommendation:** browser-only sign-in, no backend-for-frontend for now.

- **Zitadel app:** a second app `web` in the `wallet-accountant` project: User Agent type, public, PKCE, code + refresh grants, JWT access tokens. Same project, so the API should accept its tokens unchanged. Zitadel v4.19.2 needs **development mode** for `http://` redirect URIs (dev and default self-hosted `http://localhost`); off once HTTPS.
- **Library:** `oidc-client-ts` 3.5.0, plus `react-oidc-context` if React. Renew with refresh tokens, not iframes (Zitadel blocks framing).
- **Tokens:** `sessionStorage` (library default), never `localStorage`. Zitadel rotates refresh tokens already. Shorten the 12h access-token lifetime to ~15 min.
- **BFF:** preferred by the browser-apps BCP (RFC 10017 / BCP 212) for apps holding personal data, but it's a runtime server and breaks the static-build constraint. Deferred; it is the upgrade path if this becomes a hosted service.
- **Serving:** same origin via a small Caddy/nginx container forwarding `/api/*` to the app (prefix stripped), so no CORS. API paths sit at the root (`/me`, `/households`) and would clash with UI routes without a prefix. Dev: Vite on :5173 proxies `/api` to :8080; Zitadel stays on :8081.

## Backend changes (proposed, decided in [Grilling: how the UI is served next to the API](07-grilling-how-the-ui-is-served-next-to-the-api.md))

- `deploy/zitadel/setup-project.sh`: create the `web` app (refactor the `api-clients` block into a function), write its client ID to a file; optionally update redirect URIs when the app exists.
- `compose.dev.yaml` / `compose.yaml`: `zitadel-setup` env (`WEB_APP_NAME`, `WEB_APP_ORIGIN`, `WEB_CLIENT_ID_FILE`); self-hosted gains a web/proxy container, likely taking over port 8080.
- Zitadel token lifetimes shortened (`ZITADEL_DEFAULTINSTANCE_OIDCSETTINGS_*` for new instances, settings API for existing). Affects Bruno too.
- Go API: none with the same-origin proxy. Cross-origin needs CORS middleware + `WA_CORS_ALLOWED_ORIGINS`; Go-serves-UI needs the API under `/api` plus static serving.
- Docs: optionally amend ADR-0010; note the `/api` prefix for browser clients.

**Open points to verify in a prototype:** a `web` token's `aud` contains `wallet-accountant`; `CreateApplication` accepts a User Agent app in dev mode on v4.19.2; the API call to change lifetimes on an existing instance; whether Zitadel sign-out fully ends the session. DPoP not verified or recommended.
