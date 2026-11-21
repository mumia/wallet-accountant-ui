import { describe, expect, it } from "vitest";

import { http } from "./http";

describe("mock handlers", () => {
  it("are typed by the contract, so a drifting mock fails `make typecheck`", () => {
    const handler = http.get("/currencies", ({ response }) =>
      // @ts-expect-error decimal_places is an integer in the contract, not a string
      response(200).json({ items: [{ code: "EUR", decimal_places: "2" }] }),
    );

    expect(handler).toBeDefined();
  });
});
