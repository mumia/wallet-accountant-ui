#!/bin/sh
# Usage: docker/test-image.sh <image>
#
# Runs the UI image the way the backend's Helm chart does (templates/ui.yaml):
# read-only root filesystem, an empty writable /tmp, every capability dropped,
# no privilege escalation, and config.json mounted at /srv/config.json. Then
# checks the UI contract (../wallet-accountant/docs/architecture/ui-contract.md).
set -eu

image=${1:?usage: $0 <image>}
work=$(mktemp -d)
name="wa-ui-image-test-$$"
failures=0

cleanup() {
	docker rm -f "$name" >/dev/null 2>&1 || true
	rm -rf "$work"
}
trap cleanup EXIT

fail() {
	echo "FAIL: $*"
	failures=$((failures + 1))
}
pass() {
	echo "ok:   $*"
}

# The image must say who it runs as, numerically: runAsNonRoot checks it.
user=$(docker image inspect --format '{{.Config.User}}' "$image")
uid=${user%%:*}
case $uid in
'' | *[!0-9]*) fail "USER is '$user'; it must be a numeric uid" ;;
0) fail "USER is root" ;;
*) pass "runs as uid $uid" ;;
esac

# Every release states the backend contract it needs.
api_version=$(docker image inspect --format '{{index .Config.Labels "wallet-accountant.min-api-version"}}' "$image")
case $api_version in
v[0-9]*) pass "min-api-version $api_version" ;;
*) fail "label wallet-accountant.min-api-version is '$api_version'; want a backend release tag" ;;
esac

printf '{"apiBaseUrl":"/api","oidc":{"issuer":"https://auth.example.test","clientId":"test","audience":"wallet-accountant","redirectPath":"/auth/callback","postLogoutRedirectPath":"/"}}\n' >"$work/config.json"
chmod 644 "$work/config.json"

docker run -d --name "$name" \
	--read-only \
	--tmpfs /tmp \
	--cap-drop ALL \
	--security-opt no-new-privileges \
	-v "$work/config.json:/srv/config.json:ro" \
	-p 127.0.0.1::8080 \
	"$image" >/dev/null
# A free port Docker picked, so the test never clashes with a local cluster.
base="http://$(docker port "$name" 8080/tcp | head -1)"

i=0
until curl -fsS "$base/healthz" >/dev/null 2>&1; do
	i=$((i + 1))
	if [ "$i" -ge 30 ]; then
		docker logs "$name"
		echo "FAIL: /healthz never answered"
		exit 1
	fi
	sleep 1
done

# check <path> <status> <cache-control or -> [body pattern]
check() {
	path=$1 want_status=$2 want_cache=$3 want_body=${4:-}
	headers="$work/headers" body="$work/body"
	status=$(curl -sS -o "$body" -D "$headers" -w '%{http_code}' "$base$path")
	cache=$(sed -n 's/^[Cc]ache-[Cc]ontrol: *\(.*\)\r$/\1/p' "$headers")
	if [ "$status" != "$want_status" ]; then
		fail "$path: status $status, want $want_status"
		return
	fi
	if [ "$want_cache" != - ] && [ "$cache" != "$want_cache" ]; then
		fail "$path: Cache-Control '$cache', want '$want_cache'"
		return
	fi
	if [ -n "$want_body" ] && ! grep -q "$want_body" "$body"; then
		fail "$path: body doesn't contain '$want_body'"
		return
	fi
	pass "$path: $status${cache:+, $cache}"
}

asset=$(docker run --rm --entrypoint sh "$image" -c 'cd /srv && ls assets/*.js | head -1')

check /healthz 200 - ok
check / 200 no-cache '<div id="root">'
check /index.html 200 no-cache '<div id="root">'
check /households/1/accounts/2/to-review 200 no-cache '<div id="root">'
check /config.json 200 no-cache '"clientId":"test"'
check "/$asset" 200 "public, max-age=31536000, immutable"
check /assets/missing.js 404 -

running_uid=$(docker exec "$name" id -u)
if [ "$running_uid" = "$uid" ]; then
	pass "process runs as uid $running_uid"
else
	fail "process runs as uid $running_uid, want $uid"
fi

if [ "$failures" -ne 0 ]; then
	docker logs "$name"
	echo "$failures check(s) failed"
	exit 1
fi
echo "The image meets the UI contract."
