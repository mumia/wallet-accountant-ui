// Mock mode (`make dev-mock`, the e2e build): MSW serves /config.json and the
// API in the browser from the same handlers the tests use, and a signed-in User
// is put where oidc-client-ts keeps it, so the app starts without Zitadel or a
// backend. Only a `--mode mock` build includes this file.
//
// `?mock-scenario=new-user` (or `registered`, `household`) on any page starts the
// tab's mock data over from that scenario (src/mocks/db.ts); the parameter is
// then removed from the address. `?mock-fail=<path end>:<count>` makes the next
// <count> API requests whose path ends that way fail with a 503;
// `?mock-fail=PATCH:<count>` (any method) fails the next <count> of that method.
import { HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import { User } from "oidc-client-ts";

import { createMockDb, isScenario } from "./db";
import { createHandlers } from "./handlers";
import { http } from "./http";

export const mockConfig = {
  apiBaseUrl: "/api",
  oidc: {
    issuer: "https://auth.mock.invalid",
    clientId: "mock-web",
    audience: "wallet-accountant",
    redirectPath: "/auth/callback",
    postLogoutRedirectPath: "/",
  },
};

export const mockUser = { sub: "mock-user", email: "sam@example.com", name: "Sam Example" };

function signIn(): void {
  const now = Math.floor(Date.now() / 1000);
  const dayLater = now + 24 * 60 * 60;
  const user = new User({
    access_token: "mock-access-token",
    token_type: "Bearer",
    scope: "openid profile email offline_access",
    expires_at: dayLater,
    profile: {
      ...mockUser,
      iss: mockConfig.oidc.issuer,
      aud: mockConfig.oidc.clientId,
      iat: now,
      exp: dayLater,
    },
  });
  // Where oidc-client-ts's WebStorageStateStore keeps the signed-in User.
  window.sessionStorage.setItem(
    `oidc.user:${mockConfig.oidc.issuer}:${mockConfig.oidc.clientId}`,
    user.toStorageString(),
  );
}

const scenarioParameter = "mock-scenario";
const failureParameter = "mock-fail";

export async function startMockApi(): Promise<void> {
  const db = createMockDb(window.sessionStorage);
  const url = new URL(window.location.href);
  const scenario = url.searchParams.get(scenarioParameter);
  if (scenario !== null) {
    db.reset(isScenario(scenario) ? scenario : undefined);
    url.searchParams.delete(scenarioParameter);
    window.history.replaceState(window.history.state, "", url);
  }
  const failure = /^(.+):(\d+)$/.exec(url.searchParams.get(failureParameter) ?? "");
  if (failure?.[1] !== undefined && failure[2] !== undefined) {
    const remaining = Number(failure[2]);
    const isMethod = /^(GET|POST|PUT|PATCH|DELETE)$/.test(failure[1]);
    db.write({
      ...db.read(),
      failures: isMethod
        ? { method: failure[1], pathEnd: "", remaining }
        : { pathEnd: failure[1], remaining },
    });
    url.searchParams.delete(failureParameter);
    window.history.replaceState(window.history.state, "", url);
  }
  const worker = setupWorker(
    http.untyped.get("/config.json", () => HttpResponse.json(mockConfig)),
    ...createHandlers(db),
  );
  // Everything else (the app's own files) goes to the server as usual.
  await worker.start({ onUnhandledFrame: "bypass", quiet: true });
  signIn();
}
