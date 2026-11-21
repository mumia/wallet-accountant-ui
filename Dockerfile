# check=skip=InvalidDefaultArgInFrom
# The UI image (docs/architecture/conventions.md, "The image"): the static build
# served by Caddy, meeting the backend's UI contract
# (../wallet-accountant/docs/architecture/ui-contract.md).
#
# NODE_VERSION comes from .node-version; `make image` and CI pass it.
ARG NODE_VERSION

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.11.9-alpine
# Port 8080 needs no capability, and the chart drops them all: remove the one
# the binary carries for binding low ports.
RUN setcap -r /usr/bin/caddy
# The root filesystem is read-only; the chart mounts an empty writable /tmp.
ENV XDG_CONFIG_HOME=/tmp/caddy/config \
    XDG_DATA_HOME=/tmp/caddy/data
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/ /srv/
# The chart mounts the runtime config.json at /srv/config.json (ui.configPath);
# the image ships none, so a missing mount is a 404, never a made-up config.
# Numeric, so Kubernetes' runAsNonRoot can check it.
USER 10001:10001
EXPOSE 8080
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
