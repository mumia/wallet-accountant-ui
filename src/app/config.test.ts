import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { http } from "../mocks/http";
import { server } from "../test/server";
import { configSchema, loadConfig } from "./config";

// The shape the backend's chart writes (ui-contract.md, "Runtime configuration").
const chartConfig = {
  apiBaseUrl: "/api",
  oidc: {
    issuer: "https://auth.localhost:18443",
    clientId: "345678901234567890",
    audience: "wallet-accountant",
    redirectPath: "/auth/callback",
    postLogoutRedirectPath: "/",
  },
};

describe("the config schema", () => {
  it("accepts what the chart writes", () => {
    expect(configSchema.parse(chartConfig)).toEqual(chartConfig);
  });

  it("drops keys it doesn't know, at any level", () => {
    const later = { ...chartConfig, theme: "dark", oidc: { ...chartConfig.oidc, prompt: "login" } };

    expect(configSchema.parse(later)).toEqual(chartConfig);
  });

  it.each([
    ["a missing client ID", { ...chartConfig, oidc: { ...chartConfig.oidc, clientId: undefined } }],
    [
      "an issuer that isn't a URL",
      { ...chartConfig, oidc: { ...chartConfig.oidc, issuer: "auth" } },
    ],
    [
      "a redirect path that isn't a path",
      { ...chartConfig, oidc: { ...chartConfig.oidc, redirectPath: "https://evil.example/cb" } },
    ],
    ["no apiBaseUrl", { oidc: chartConfig.oidc }],
  ])("refuses %s", (_name, config) => {
    expect(configSchema.safeParse(config).success).toBe(false);
  });
});

describe("loadConfig", () => {
  const serve = (response: () => Response) => {
    server.use(http.untyped.get("*/config.json", response));
  };

  it("loads /config.json", async () => {
    serve(() => HttpResponse.json(chartConfig));

    expect(await loadConfig()).toEqual({ ok: true, config: chartConfig });
  });

  it("says when the file is missing", async () => {
    serve(() => new HttpResponse(null, { status: 404 }));

    expect(await loadConfig()).toEqual({ ok: false, problem: "/config.json: HTTP 404" });
  });

  it("says when it isn't JSON, as when the SPA fallback answers instead", async () => {
    serve(() => HttpResponse.html("<!doctype html>"));

    expect(await loadConfig()).toEqual({ ok: false, problem: "/config.json isn't JSON" });
  });

  it("says which key is wrong", async () => {
    serve(() => HttpResponse.json({ ...chartConfig, oidc: { ...chartConfig.oidc, clientId: "" } }));

    const result = await loadConfig();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toMatch(/clientId/);
  });
});
