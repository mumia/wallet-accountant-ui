import { describe, expect, it } from "vitest";

import { settleEach } from "./pool";

describe("settleEach", () => {
  it("runs at most `limit` at once and keeps the items' order", async () => {
    let running = 0;
    let most = 0;
    const results = await settleEach([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 10 - n));
      running -= 1;
      if (n === 4) {
        throw new Error("four");
      }
      return n * 10;
    });

    expect(most).toBe(3);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "rejected",
      "fulfilled",
      "fulfilled",
      "fulfilled",
    ]);
    expect(results[0]).toEqual({ status: "fulfilled", value: 10 });
  });
});
