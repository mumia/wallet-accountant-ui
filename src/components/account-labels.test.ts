import { describe, expect, it } from "vitest";

import { extensibleEnum } from "../test/contract";
import { kindKeys } from "./account-labels";

describe("Account kind labels", () => {
  it("label every kind the contract lists", () => {
    expect(Object.keys(kindKeys).sort()).toEqual(extensibleEnum("AccountKind").sort());
  });
});
