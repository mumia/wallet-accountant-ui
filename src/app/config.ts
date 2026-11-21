// The runtime configuration (the backend's UI contract, "Runtime
// configuration"): /config.json, mounted by the chart, read before the app
// starts. Nothing is baked in at build time. Unknown keys are dropped, never
// refused: the contract may add keys.
import { z } from "zod";

const pagePath = z.string().startsWith("/");

export const configSchema = z.object({
  apiBaseUrl: z.string().min(1),
  oidc: z.object({
    issuer: z.url({ protocol: /^https?$/ }),
    clientId: z.string().min(1),
    /** The API's audience. Zitadel puts it in the `web` app's tokens; the UI doesn't send it. */
    audience: z.string().min(1),
    redirectPath: pagePath,
    postLogoutRedirectPath: pagePath,
  }),
});

export type Config = z.infer<typeof configSchema>;

export type ConfigResult = { ok: true; config: Config } | { ok: false; problem: string };

/** Fetches and checks /config.json; a missing or wrong file is a problem for the operator. */
export async function loadConfig(): Promise<ConfigResult> {
  let response: Response;
  try {
    response = await fetch(new URL("/config.json", window.location.href), { cache: "no-store" });
  } catch (error) {
    return { ok: false, problem: `/config.json: ${String(error)}` };
  }
  if (!response.ok) {
    return { ok: false, problem: `/config.json: HTTP ${String(response.status)}` };
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, problem: "/config.json isn't JSON" };
  }
  const parsed = configSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, problem: `/config.json: ${z.prettifyError(parsed.error)}` };
  }
  return { ok: true, config: parsed.data };
}
