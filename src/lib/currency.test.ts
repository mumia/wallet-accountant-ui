import { describe, expect, it } from "vitest";

import { currencyName } from "./currency";

describe("currencyName", () => {
  it("names a currency Intl knows", () => {
    expect(currencyName("EUR", "en")).toBe("Euro");
    expect(currencyName("JPY", "en")).toBe("Japanese Yen");
  });

  it("has no name for a code Intl doesn't know", () => {
    expect(currencyName("ETH", "en")).toBeUndefined();
    expect(currencyName("USDCX", "en")).toBeUndefined();
  });
});
