# Every way of running the project has a target (docs/architecture/conventions.md).
# Node runs only in Docker: each target runs an npm script inside the official
# Node image, whose version comes from .node-version.

NODE_VERSION := $(shell cat .node-version)
NODE_IMAGE   := node:$(NODE_VERSION)-bookworm-slim
# node_modules and the npm cache live in named volumes, so Linux packages never
# mix with the host's and installs stay fast.
NODE_VOLUME  := wallet-accountant-ui-node-modules
NPM_CACHE    := wallet-accountant-ui-npm-cache
DEV_PORT     ?= 5173
# Where the dev server forwards /api: the local cluster's app, or `make run` in
# wallet-accountant with API_PROXY_TARGET=http://host.docker.internal:8080.
API_PROXY_TARGET ?= https://wallet.localhost:18443
# The mkcert CA (`make local-ca` in wallet-accountant) signs the dev certificate,
# and the dev server trusts it for the cluster's HTTPS.
MKCERT_CAROOT := $(shell mkcert -CAROOT 2>/dev/null)
LOCAL_CLUSTER ?= wallet-accountant
LOCAL_CONTEXT ?= k3d-$(LOCAL_CLUSTER)
LOCAL_HTTPS_PORT ?= 18443
IMAGE        ?= wallet-accountant-ui:local
# `make local-deploy`: the backend's checkout, whose `make local-push` deploys
# this repo's last local build (recorded in LOCAL_BUILD, which it reads as
# LOCAL_UI_BUILD) in the chart's UI slot, and the k3d registry it pushes to.
WA_REPO      ?= ../wallet-accountant
LOCAL_REGISTRY_PORT ?= 5050
LOCAL_BUILD  := bin/local-build.env
# The backend release whose contract src/api/openapi.yaml is; images carry it.
CONTRACT_VERSION := $(shell cat src/api/CONTRACT_VERSION)
# Playwright's image runs the e2e tests; its version is @playwright/test's in
# package.json, so the two can't drift apart.
PLAYWRIGHT_VERSION := $(shell sed -n 's/.*"@playwright\/test": "\(.*\)".*/\1/p' package.json)
PLAYWRIGHT_IMAGE   := mcr.microsoft.com/playwright:v$(PLAYWRIGHT_VERSION)-noble
# actionlint checks .github/workflows. The `# renovate:` comment lets Renovate bump it.
# renovate: datasource=docker depName=rhysd/actionlint
ACTIONLINT_VERSION := 1.7.12
# A terminal is attached only when there is one (not in scripts or agents).
TTY          := $(shell [ -t 0 ] && echo -it)

DOCKER_NODE  = docker run --rm $(TTY) \
	-v "$(CURDIR)":/app \
	-v $(NODE_VOLUME):/app/node_modules \
	-v $(NPM_CACHE):/root/.npm \
	-w /app $(1) $(NODE_IMAGE)

.DEFAULT_GOAL := help

.PHONY: help deps install dev dev-mock dev-cert dev-config local-deploy local-smoke ui-add e2e build preview generate contract-check contract-update lint actionlint format typecheck test audit image image-test check shell npm clean-deps

help: ## List the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-12s %s\n", $$1, $$2}'

# Installs from package-lock.json when it is newer than the last install.
deps:
	@$(call DOCKER_NODE) sh -c '[ node_modules/.package-lock.json -nt package-lock.json ] || npm ci'

install: ## Reinstall dependencies from package-lock.json
	$(call DOCKER_NODE) npm ci

dev: deps ## Run the dev server on https://localhost:5173, /api forwarded to API_PROXY_TARGET
	@test -f .certs/localhost.pem || { echo "No dev certificate: run 'make dev-cert' once."; exit 1; }
	@test -f public/config.json || echo "No public/config.json: run 'make dev-config', or write one (docs/architecture/conventions.md)."
	$(call DOCKER_NODE,-p $(DEV_PORT):5173 \
		--add-host wallet.localhost:host-gateway \
		-e API_PROXY_TARGET=$(API_PROXY_TARGET) \
		-e NODE_EXTRA_CA_CERTS=/mkcert/rootCA.pem \
		-v "$(MKCERT_CAROOT)/rootCA.pem":/mkcert/rootCA.pem:ro) npm run dev

dev-mock: deps ## Run the dev server against the mock API, signed in, no cluster needed
	$(call DOCKER_NODE,-p $(DEV_PORT):5173) npm run dev:mock

dev-cert: ## Make the dev server's certificate for localhost with the mkcert CA (once)
	@test -f "$(MKCERT_CAROOT)/rootCA.pem" || { echo "No mkcert CA: run 'make local-ca' in wallet-accountant once."; exit 1; }
	mkdir -p .certs
	mkcert -cert-file .certs/localhost.pem -key-file .certs/localhost-key.pem localhost 127.0.0.1 ::1

dev-config: ## Write public/config.json from the local cluster's OIDC ConfigMap
	mkdir -p public
	@kubectl --context $(LOCAL_CONTEXT) -n wallet-accountant get configmap wallet-accountant-oidc \
		-o jsonpath='{.data.config\.json}' > public/config.json.tmp \
		|| { rm -f public/config.json.tmp; echo "Is the local cluster up with Wallet Accountant deployed? ('make local-up' in wallet-accountant)"; exit 1; }
	@test -s public/config.json.tmp || { rm -f public/config.json.tmp; echo "The ConfigMap has no config.json."; exit 1; }
	mv public/config.json.tmp public/config.json

# No terminal, so the CLI never waits at a prompt nobody can see; --yes answers
# the rest. Pass o=--overwrite to update parts, then review the diff.
ui-add: TTY :=
ui-add: deps ## Add shadcn/ui parts with the pinned CLI, e.g. make ui-add c="button dialog"
	$(call DOCKER_NODE) npx shadcn add $(c) --yes $(o)

e2e: deps ## Build the mock app and run the Playwright and axe tests in Playwright's image
	$(call DOCKER_NODE) npm run build:mock
	docker run --rm $(TTY) --ipc=host \
		-v "$(CURDIR)":/app -v $(NODE_VOLUME):/app/node_modules -w /app \
		$(PLAYWRIGHT_IMAGE) npm run e2e

build: deps ## Build the static app into dist/
	$(call DOCKER_NODE) npm run build

preview: build ## Serve the built app on http://localhost:4173
	$(call DOCKER_NODE,-p 4173:4173) npm run preview

generate: deps ## Regenerate the route tree and the API types
	$(call DOCKER_NODE) npm run generate

contract-check: deps ## Check src/api/openapi.yaml against the pinned backend release
	$(call DOCKER_NODE) npm run contract:check

contract-update: deps ## Copy the backend contract at ref=<tag or commit>, then regenerate
	$(call DOCKER_NODE) sh -c 'npm run contract:update -- "$(ref)" && npm run generate'

lint: deps actionlint ## ESLint, the Prettier check and actionlint
	$(call DOCKER_NODE) npm run lint

actionlint: ## Check the GitHub Actions workflows
	docker run --rm -v "$(CURDIR)":/repo -w /repo rhysd/actionlint:$(ACTIONLINT_VERSION) -color

format: deps ## Prettier and ESLint fixes
	$(call DOCKER_NODE) npm run format

typecheck: deps ## TypeScript
	$(call DOCKER_NODE) npm run typecheck

test: deps ## Vitest
	$(call DOCKER_NODE) npm test

audit: deps ## npm audit of the runtime dependencies (high and above)
	$(call DOCKER_NODE) npm run audit

image: ## Build the UI image (IMAGE, default wallet-accountant-ui:local)
	docker build --build-arg NODE_VERSION=$(NODE_VERSION) \
		--label wallet-accountant.min-api-version=$(CONTRACT_VERSION) -t $(IMAGE) .

image-test: image ## Run the image as the chart does and check the UI contract
	docker/test-image.sh $(IMAGE)

# A unique tag per build, so Flux rolls each one out. The build is recorded
# only once its image is in the registry. wallet-accountant's stage.sh puts it
# in the UI slot unless the stand-in UI's build there is newer, or there is no
# app build; then this fails rather than leave another UI running unnoticed.
local-deploy: ## Build the image, push it to the local cluster's registry and have Flux run it at https://wallet.localhost:18443
	@set -e; tag=local-$$(date -u +%Y%m%d%H%M%S); \
	image=localhost:$(LOCAL_REGISTRY_PORT)/wallet-accountant-ui:$$tag; \
	$(MAKE) --no-print-directory image IMAGE=$$image; \
	docker push -q $$image; \
	mkdir -p bin; \
	printf 'WALLET_ACCOUNTANT_UI_IMAGE=wallet-accountant-ui\nWALLET_ACCOUNTANT_UI_TAG=%s\n' $$tag > $(LOCAL_BUILD); \
	echo "local-deploy: image $$image"; \
	out=$$($(MAKE) -C $(WA_REPO) --no-print-directory local-push LOCAL_UI_BUILD=$(abspath $(LOCAL_BUILD)) 2>&1) || { echo "$$out"; exit 1; }; \
	echo "$$out" | grep '^stage:' || true; \
	echo "$$out" | grep -qx "stage: with the UI wallet-accountant-ui:$$tag" || { \
		echo "local-deploy: wallet-accountant didn't deploy this build. Has it an app build ('make local-deploy' there), or a newer stand-in UI?"; exit 1; }; \
	flux --context $(LOCAL_CONTEXT) reconcile kustomization cluster --with-source --timeout=5m; \
	flux --context $(LOCAL_CONTEXT) reconcile kustomization wallet-accountant --timeout=10m; \
	echo "local-deploy: https://wallet.localhost:18443"

# The smoke test's steps, and what it needs, are in smoke/smoke.sh. Traces and
# screenshots of a failed run land in bin/smoke-results.
local-smoke: deps ## From no cluster: the backend's local-up and local-deploy, this UI's local-deploy, the browser test through the real stack, then local-down (SMOKE_KEEP=1 keeps the cluster)
	WA_REPO=$(WA_REPO) LOCAL_CLUSTER=$(LOCAL_CLUSTER) LOCAL_HTTPS_PORT=$(LOCAL_HTTPS_PORT) \
		PLAYWRIGHT_IMAGE=$(PLAYWRIGHT_IMAGE) NODE_VOLUME=$(NODE_VOLUME) RESULTS_DIR=bin/smoke-results \
		smoke/smoke.sh

check: deps actionlint ## Every CI check
	$(call DOCKER_NODE) sh -c 'npm run check && npm run audit && npm run contract:check'
	$(MAKE) e2e
	$(MAKE) image-test

shell: deps ## A shell in the Node container
	$(call DOCKER_NODE) bash

npm: ## Run npm with arguments, e.g. make npm a="install -E zod@4"
	$(call DOCKER_NODE) npm $(a)

clean-deps: ## Remove the node_modules volume
	docker volume rm $(NODE_VOLUME)
