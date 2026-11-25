#!/bin/sh
# The real-stack smoke test (`make local-smoke`), from nothing, as
# wallet-accountant's own `make local-smoke` does:
#
# 1. refuse to start when the cluster exists, rather than delete it;
# 2. `make local-up`, then `make local-deploy`, in the backend's checkout
#    (WA_REPO), then this repo's `make local-deploy`;
# 3. two Zitadel human users with random passwords (the first redeems the
#    bootstrap Invitation code from `make local-bootstrap`, the second joins
#    the first's Household), which go into the test's environment only, never
#    into a log;
# 4. the browser test (smoke/smoke.spec.ts) in Playwright's image, on the k3d
#    cluster's Docker network; a failed run's traces and screenshots go to
#    RESULTS_DIR;
# 5. `make local-down`, whatever happened (SMOKE_KEEP=1 keeps the cluster).
#
# Both repos record their builds in SMOKE_BUILD, each under its own directory,
# so neither developer's bin/local-build.env is touched. This repo's
# local-deploy is run with LOCAL_BUILD=$SMOKE_BUILD on the command line, which
# make passes on to the backend's local-push, so it stages the backend build
# made just before.
#
# Needs docker, k3d, kubectl, flux, mkcert, curl, jq and openssl. WA_REPO,
# LOCAL_CLUSTER, LOCAL_HTTPS_PORT, PLAYWRIGHT_IMAGE, NODE_VOLUME and
# RESULTS_DIR come from the Makefile.
set -eu

: "${WA_REPO:?}" "${LOCAL_CLUSTER:?}" "${LOCAL_HTTPS_PORT:?}" "${PLAYWRIGHT_IMAGE:?}"
: "${NODE_VOLUME:?}" "${RESULTS_DIR:?}"
: "${MAKE:=make}"
SMOKE_BUILD=bin/local-smoke-build.env
CTX="k3d-$LOCAL_CLUSTER"
KUBECTL="kubectl --context $CTX"
NS=wallet-accountant
wa=$(cd "$WA_REPO" && pwd)
# The backend's targets, with the smoke test's build record and no UI build
# of a developer's: this repo's local-deploy adds the one made here.
wa_make() { $MAKE -C "$wa" --no-print-directory LOCAL_BUILD="$SMOKE_BUILD" LOCAL_UI_BUILD= "$@"; }

started=$(date +%s)
step() { printf '\nsmoke [%ss]: %s\n' "$(($(date +%s) - started))" "$*"; }
fail() {
	echo "smoke: FAIL: $*" >&2
	exit 1
}

if k3d cluster get "$LOCAL_CLUSTER" >/dev/null 2>&1; then
	echo "smoke: the cluster $LOCAL_CLUSTER exists; the smoke test starts from nothing. Run 'make local-down' in wallet-accountant first." >&2
	exit 1
fi

cleanup() {
	status=$?
	if [ "$status" -ne 0 ]; then
		echo "smoke: FAILED; the cluster's state:" >&2
		$KUBECTL get pods -A >&2 2>&1 || true
		$KUBECTL -n $NS logs deployment/wallet-accountant-all --tail=40 >&2 2>&1 || true
		$KUBECTL -n $NS logs deployment/wallet-accountant-ui --tail=20 >&2 2>&1 || true
		[ ! -d "$RESULTS_DIR" ] || echo "smoke: traces and screenshots, if the browser test ran: $RESULTS_DIR" >&2
	fi
	if [ -n "${SMOKE_KEEP:-}" ]; then
		echo "smoke: SMOKE_KEEP is set; the cluster is kept" >&2
	else
		step "make local-down (wallet-accountant)"
		wa_make local-down >/dev/null 2>&1 || true
	fi
	rm -f "$SMOKE_BUILD" "$wa/$SMOKE_BUILD"
	printf 'smoke: %s in %ss\n' "$([ "$status" -eq 0 ] && echo passed || echo failed)" "$(($(date +%s) - started))"
	exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

rm -f "$SMOKE_BUILD" "$wa/$SMOKE_BUILD"
rm -rf "$RESULTS_DIR"

step "make local-up (wallet-accountant)"
wa_make local-up

step "make local-deploy (wallet-accountant)"
wa_make local-deploy

step "make local-deploy"
$MAKE --no-print-directory local-deploy LOCAL_BUILD="$SMOKE_BUILD"
# The setup Job restarts the UI once config.json holds the web app's client ID.
$KUBECTL -n $NS rollout status deployment/wallet-accountant-ui --timeout=5m

step "two Zitadel users, and a bootstrap Invitation code"
. "$wa/deploy/local/zitadel.sh"
zitadel_env "$CTX" "$LOCAL_HTTPS_PORT"
[ -n "$ZITADEL_PAT" ] || fail "no Zitadel machine user token; is the cluster up?"
WA_UI_PASSWORD="Wa-$(openssl rand -hex 12)-1!"
WA_UI_USER=$(zitadel_human_user ui-smoke "$WA_UI_PASSWORD") || fail "could not set up the Zitadel user ui-smoke"
WA_UI_SECOND_PASSWORD="Wa-$(openssl rand -hex 12)-1!"
WA_UI_SECOND_USER=$(zitadel_human_user ui-smoke-2 "$WA_UI_SECOND_PASSWORD") ||
	fail "could not set up the Zitadel user ui-smoke-2"
# The whole output first: a pipe that closes early would kill kubectl run
# before it deletes the pod. Neither it nor the code is printed.
out=$(wa_make -s local-bootstrap) || fail "make local-bootstrap failed"
WA_INVITATION_CODE=$(echo "$out" | bootstrap_code)
unset out
[ -n "$WA_INVITATION_CODE" ] || fail "make local-bootstrap printed no Invitation code"
export WA_UI_USER WA_UI_PASSWORD WA_UI_SECOND_USER WA_UI_SECOND_PASSWORD WA_INVITATION_CODE

step "the browser test"
origin=https://wallet.localhost
[ "$LOCAL_HTTPS_PORT" = 443 ] || origin="$origin:$LOCAL_HTTPS_PORT"
mkdir -p "$RESULTS_DIR"
results=$(cd "$RESULTS_DIR" && pwd)
# The secrets go by name (-e NAME), so they are in no command line. The
# working tree is read-only; node_modules is the Makefile's volume.
docker run --rm --init --ipc=host \
	--network "$CTX" --add-host wallet.localhost:127.0.0.1 --add-host auth.localhost:127.0.0.1 \
	-v "$(pwd):/app:ro" -v "$NODE_VOLUME:/app/node_modules" -v "$CA:/ca.pem:ro" -v "$results:/results" \
	-w /app -e npm_config_update_notifier=false \
	-e WA_UI_BASE_URL="$origin" -e WA_UI_USER -e WA_UI_PASSWORD \
	-e WA_UI_SECOND_USER -e WA_UI_SECOND_PASSWORD -e WA_INVITATION_CODE \
	-e WA_INGRESS="$CTX-serverlb:443" -e WA_CA_FILE=/ca.pem -e NODE_EXTRA_CA_CERTS=/ca.pem \
	-e WA_TLS_NAMES="wallet.localhost auth.localhost" -e WA_RESULTS_DIR=/results \
	"$PLAYWRIGHT_IMAGE" npx --no-install playwright test -c smoke/playwright.config.ts
