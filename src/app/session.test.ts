import { describe, expect, it, vi } from "vitest";

import { createSessionEndedSignal, returnPath, userManagerSettings } from "./session";

describe("returnPath", () => {
  it.each([
    [
      { returnTo: "/households/1/accounts/2/to-review?booking_month=2026-01" },
      "/households/1/accounts/2/to-review?booking_month=2026-01",
    ],
    [{ returnTo: "/" }, "/"],
  ])("comes back to %j", (state, path) => {
    expect(returnPath(state)).toBe(path);
  });

  it.each([
    ["no state", undefined],
    ["another origin", { returnTo: "https://evil.example/" }],
    ["a protocol-relative URL", { returnTo: "//evil.example/" }],
    ["a non-string", { returnTo: 42 }],
  ])("goes home for %s", (_name, state) => {
    expect(returnPath(state)).toBe("/");
  });
});

describe("userManagerSettings", () => {
  it("signs in through the web app with PKCE and a refresh token", () => {
    const settings = userManagerSettings(
      {
        apiBaseUrl: "/api",
        oidc: {
          issuer: "https://auth.localhost:18443",
          clientId: "web-client",
          audience: "wallet-accountant",
          redirectPath: "/auth/callback",
          postLogoutRedirectPath: "/",
        },
      },
      "https://localhost:5173",
    );

    expect(settings).toMatchObject({
      authority: "https://auth.localhost:18443",
      client_id: "web-client",
      redirect_uri: "https://localhost:5173/auth/callback",
      post_logout_redirect_uri: "https://localhost:5173/",
      response_type: "code",
      automaticSilentRenew: true,
    });
    expect(settings.scope?.split(" ")).toContain("offline_access");
    // Never localStorage, which may be blocked: the app would not start.
    expect(settings.userStore).toBeDefined();
    expect(settings.stateStore).toBeDefined();
  });
});

describe("the session-ended signal", () => {
  it("tells its listeners once", () => {
    const signal = createSessionEndedSignal();
    const listener = vi.fn();
    signal.subscribe(listener);

    signal.end();
    signal.end();

    expect(signal.ended()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });
});
