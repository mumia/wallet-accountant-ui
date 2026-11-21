// Retry rules (spec, "Talking to the API"). TanStack Query calls these with the
// number of failures so far and the last error.
import { errorStatus, isNetworkError } from "./problem";

const readAttempts = 3;
const writeRetries = 2;

/** Reads retry on network errors and 5xx, never on 4xx. */
export function shouldRetryRead(failureCount: number, error: unknown): boolean {
  if (failureCount >= readAttempts) {
    return false;
  }
  const status = errorStatus(error);
  return isNetworkError(error) || (status !== undefined && status >= 500);
}

/**
 * Writes retry twice, with the same Idempotency-Key, on network errors and
 * 502/503/504 only: never after a 4xx or a 500, which may have done the work.
 */
export function shouldRetryWrite(failureCount: number, error: unknown): boolean {
  if (failureCount >= writeRetries) {
    return false;
  }
  const status = errorStatus(error);
  return isNetworkError(error) || status === 502 || status === 503 || status === 504;
}
