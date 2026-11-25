import { describe, expect, it } from "vitest";

import { forgetLastHousehold, readLastHousehold, saveLastHousehold } from "./last-household";

const blocked = (): Storage => {
  throw new DOMException("Blocked", "SecurityError");
};

describe("the last Household", () => {
  it("is remembered in storage", () => {
    window.localStorage.clear();
    expect(readLastHousehold()).toBeUndefined();

    saveLastHousehold("h-1");
    expect(readLastHousehold()).toBe("h-1");
  });

  it("is forgotten only when it's the Household named", () => {
    window.localStorage.clear();
    saveLastHousehold("h-1");

    forgetLastHousehold("h-2");
    expect(readLastHousehold()).toBe("h-1");

    forgetLastHousehold("h-1");
    expect(readLastHousehold()).toBeUndefined();
  });

  it("is forgotten, without an error, when storage is blocked", () => {
    expect(() => {
      saveLastHousehold("h-1", blocked);
    }).not.toThrow();
    expect(() => {
      forgetLastHousehold("h-1", blocked);
    }).not.toThrow();
    expect(readLastHousehold(blocked)).toBeUndefined();
  });
});
