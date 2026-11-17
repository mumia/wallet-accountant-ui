# Grilling: how the UI is served next to the API

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 03

## Question

How is the static UI served alongside the API, in self-hosting (Compose) and in local development?

Options include: the Go binary embedding and serving the built UI (same origin, one image); a separate static container (e.g. Caddy or nginx) that also reverse-proxies `/api` (same origin, two images); or a separate origin with CORS enabled in the backend. Decide which, what it means for releases and versioning across the two repos, how the UI learns its runtime config (API base URL, Zitadel issuer and client ID) without rebuilding, and how local dev runs (Vite dev server proxying to `make run` on :8080). List every backend change this implies.
