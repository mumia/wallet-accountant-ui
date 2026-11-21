import type { components } from "./schema.gen";

/** An RFC 9457 problem, as every API error is. */
export type Problem = components["schemas"]["Problem"];

export function isProblem(value: unknown): value is Problem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { title, status } = value as Record<string, unknown>;
  return typeof title === "string" && typeof status === "number";
}

/** The HTTP status of an API error, when the server answered at all. */
export function errorStatus(error: unknown): number | undefined {
  return isProblem(error) ? error.status : undefined;
}

/** A request that never got an answer: offline, DNS, a dropped connection. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
