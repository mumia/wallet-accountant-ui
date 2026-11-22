import { describe, expect, it } from "vitest";

import { extensibleEnum } from "../../test/contract";
import { monthStates } from "./months-tab";

describe("month states", () => {
  it("names every state the contract lists", () => {
    expect([...monthStates].sort()).toEqual(extensibleEnum("AccountMonth").sort());
  });
});
