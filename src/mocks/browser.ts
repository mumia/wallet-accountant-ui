// Mock mode (`make dev-mock`, the e2e build): MSW serves /config.json and the
// API in the browser from the same handlers the tests use, and a signed-in User
// is put where oidc-client-ts keeps it, so the app starts without Zitadel or a
// backend. Only a `--mode mock` build includes this file.
import { HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import { User } from "oidc-client-ts";

import { handlers } from "./handlers";
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

export async function startMockApi(): Promise<void> {
  const worker = setupWorker(
    http.untyped.get("/config.json", () => HttpResponse.json(mockConfig)),
    ...handlers,
  );
  // Everything else (the app's own files) goes to the server as usual.
  await worker.start({ onUnhandledFrame: "bypass", quiet: true });
  signIn();
}
