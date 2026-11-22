// @vitest-environment node
// Node's own FormData and File: jsdom's can't be sent in Node's Request.
import type { MiddlewareCallbackParams } from "openapi-fetch";
import { describe, expect, it } from "vitest";

import { idempotencyKeys } from "./idempotency";

const url = "https://wallet.test/api/households/h/connections/c/statement-imports";

function upload(balance: string): Request {
  const form = new FormData();
  form.append("file", new File(["Date;Amount\n2026-03-01;-4.20\n"], "march.csv"));
  form.append("export_balance", balance);
  return new Request(url, { method: "POST", body: form });
}

async function keyOf(middleware: ReturnType<typeof idempotencyKeys>, request: Request) {
  const sent = await middleware.onRequest?.({ request } as MiddlewareCallbackParams & {
    request: Request;
  });
  return sent instanceof Request ? sent.headers.get("Idempotency-Key") : null;
}

describe("Idempotency-Key on a multipart upload", () => {
  it("is the same for the same file and fields, though each body has its own boundary", async () => {
    let next = 0;
    const middleware = idempotencyKeys(() => `key-${String((next += 1))}`);

    const first = await keyOf(middleware, upload("10.00"));
    const again = await keyOf(middleware, upload("10.00"));
    const changed = await keyOf(middleware, upload("11.00"));

    expect(first).toBe("key-1");
    expect(again).toBe("key-1");
    expect(changed).toBe("key-2");
  });
});
