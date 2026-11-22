// Idempotency-Key on every write (spec, "Talking to the API"), owned by this one
// middleware so no screen handles keys. A request is identified by its method,
// URL and body:
// - the same request sent again after an error (a retry, by TanStack Query or by
//   the User) reuses its key, so the backend never runs it twice;
// - a changed input is a different request, so it gets a new key (the backend
//   answers the same key with a different body with 422);
// - after a success the key is forgotten, so the next request gets a new one.
import type { Middleware } from "openapi-fetch";

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * A request's body as bytes. A multipart body is read part by part, because each
 * time a FormData is sent it gets a new random boundary: the same file and fields
 * sent again must still be the same request.
 */
async function bodyBytes(request: Request): Promise<ArrayBuffer> {
  if (!(request.headers.get("Content-Type") ?? "").startsWith("multipart/form-data")) {
    return request.clone().arrayBuffer();
  }
  const parts: BlobPart[] = [];
  for (const [name, value] of await request.clone().formData()) {
    parts.push(name, "\0");
    if (typeof value === "string") {
      parts.push("s", value);
    } else {
      parts.push("f", value.name, "\0", value.type, "\0", value);
    }
    parts.push("\0");
  }
  return new Blob(parts).arrayBuffer();
}

async function fingerprint(request: Request): Promise<string> {
  const body = await bodyBytes(request);
  const head = new TextEncoder().encode(`${request.method} ${request.url}\n`);
  const bytes = new Uint8Array(head.byteLength + body.byteLength);
  bytes.set(head);
  bytes.set(new Uint8Array(body), head.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function idempotencyKeys(newKey: () => string = () => crypto.randomUUID()): Middleware {
  /** Keys of requests not yet answered with success, by fingerprint. */
  const pending = new Map<string, string>();

  return {
    async onRequest({ request }) {
      if (!writeMethods.has(request.method) || request.headers.has("Idempotency-Key")) {
        return undefined;
      }
      const id = await fingerprint(request);
      const key = pending.get(id) ?? newKey();
      pending.set(id, key);
      request.headers.set("Idempotency-Key", key);
      return request;
    },
    onResponse({ request, response }) {
      const key = request.headers.get("Idempotency-Key");
      if (response.ok && key !== null) {
        for (const [id, pendingKey] of pending) {
          if (pendingKey === key) {
            pending.delete(id);
          }
        }
      }
      return undefined;
    },
  };
}
