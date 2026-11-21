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
# A terminal is attached only when there is one (not in scripts or agents).
TTY          := $(shell [ -t 0 ] && echo -it)

DOCKER_NODE  = docker run --rm $(TTY) \
	-v "$(CURDIR)":/app \
	-v $(NODE_VOLUME):/app/node_modules \
	-v $(NPM_CACHE):/root/.npm \
	-w /app $(1) $(NODE_IMAGE)

.DEFAULT_GOAL := help

.PHONY: help deps install dev build preview generate lint format typecheck test check shell npm clean-deps

help: ## List the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  %-12s %s\n", $$1, $$2}'

# Installs from package-lock.json when it is newer than the last install.
deps:
	@$(call DOCKER_NODE) sh -c '[ node_modules/.package-lock.json -nt package-lock.json ] || npm ci'

install: ## Reinstall dependencies from package-lock.json
	$(call DOCKER_NODE) npm ci

dev: deps ## Run the dev server on http://localhost:5173
	$(call DOCKER_NODE,-p $(DEV_PORT):5173) npm run dev

build: deps ## Build the static app into dist/
	$(call DOCKER_NODE) npm run build

preview: build ## Serve the built app on http://localhost:4173
	$(call DOCKER_NODE,-p 4173:4173) npm run preview

generate: deps ## Regenerate the route tree
	$(call DOCKER_NODE) npm run generate

lint: deps ## ESLint and the Prettier check
	$(call DOCKER_NODE) npm run lint

format: deps ## Prettier and ESLint fixes
	$(call DOCKER_NODE) npm run format

typecheck: deps ## TypeScript
	$(call DOCKER_NODE) npm run typecheck

test: deps ## Vitest
	$(call DOCKER_NODE) npm test

check: deps ## Every CI check
	$(call DOCKER_NODE) npm run check

shell: deps ## A shell in the Node container
	$(call DOCKER_NODE) bash

npm: ## Run npm with arguments, e.g. make npm a="install -E zod@4"
	$(call DOCKER_NODE) npm $(a)

clean-deps: ## Remove the node_modules volume
	docker volume rm $(NODE_VOLUME)
