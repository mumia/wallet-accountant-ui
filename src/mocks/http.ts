// MSW handlers typed by the contract (openapi-msw): a mock that drifts from
// src/api/openapi.yaml is a type error. The same handlers serve tests, and later
// dev and e2e (docs/architecture/conventions.md, "Testing").
import { createOpenApiHttp } from "openapi-msw";

import { parseExactJson, stringifyExactJson } from "../api/exact-json";
import type { paths } from "../api/schema.gen";

export const http = createOpenApiHttp<paths>({ baseUrl: "*/api" });

/**
 * Rewrites a typed JSON response so each `amount` is an exact JSON number, as
 * the backend sends it: `response.untyped(await withExactAmounts(response(200).json(body)))`.
 * Without it MSW would send amounts as JSON strings, which the backend never does.
 */
export async function withExactAmounts(response: Response): Promise<Response> {
  const body = stringifyExactJson(parseExactJson(await response.text()));
  const headers = new Headers(response.headers);
  // The body changed length.
  headers.delete("Content-Length");
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
