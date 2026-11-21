// The API client (docs/architecture/conventions.md, "API client"): openapi-fetch
// typed by the generated schema, with exact money both ways, an Idempotency-Key
// on every write, every error as a problem, and openapi-react-query hooks on top.
// Writes are plain `api.useMutation` calls: the key and the retries (the query
// client's defaults, src/api/retry.ts) need nothing from the screen.
import createFetchClient, { type Middleware } from "openapi-fetch";
import createQueryHooks from "openapi-react-query";

import { parseExactJson, stringifyExactJson } from "./exact-json";
import { idempotencyKeys } from "./idempotency";
import { isProblem, type Problem } from "./problem";
import type { paths } from "./schema.gen";

const isJson = (response: Response) =>
  /^application\/(problem\+)?json\b/.test(response.headers.get("Content-Type") ?? "");

/**
 * Re-reads JSON bodies with the exact reviver, so amounts reach openapi-fetch as
 * decimal text, and gives every error response a problem body, so callers and
 * retries always see a status.
 */
const exactMoneyAndProblems: Middleware = {
  async onResponse({ response }) {
    const text = await response.clone().text();
    let body: unknown = text === "" ? undefined : text;
    if (body !== undefined && isJson(response)) {
      body = parseExactJson(text);
    }
    if (!response.ok && !isProblem(body)) {
      const problem: Problem = {
        type: "about:blank",
        title: response.statusText,
        status: response.status,
      };
      body = problem;
    }
    if (body === undefined || typeof body === "string") {
      return response;
    }
    const headers = new Headers(response.headers);
    headers.set("Content-Type", "application/json");
    headers.delete("Content-Length");
    // Amounts are strings now, so plain JSON keeps them exact from here on.
    return new Response(JSON.stringify(body), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

/** The API's base URL: relative to the page, made absolute for fetch. */
function apiBaseUrl(path: string): string {
  return new URL(path, window.location.href).href.replace(/\/$/, "");
}

export const fetchClient = createFetchClient<paths>({
  baseUrl: apiBaseUrl("/api"),
  bodySerializer: stringifyExactJson,
  // Looked up on each call, not captured here, so MSW's patched fetch is used in tests.
  fetch: (request) => globalThis.fetch(request),
});
// Order matters: the key is set on the way out, money is read on the way in.
fetchClient.use(idempotencyKeys(), exactMoneyAndProblems);

/** TanStack Query hooks for every operation: `api.useQuery("get", "/currencies")`. */
export const api = createQueryHooks(fetchClient);
