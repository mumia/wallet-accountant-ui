import { describe, expect, it } from "vitest";

import { clickHeader, clickRow, headerState } from "./selection";

const ids = ["a", "b", "c", "d", "e"];

describe("bulk selection", () => {
  it("toggles one row", () => {
    expect([...clickRow(new Set(), ids, "b", true, false, undefined)]).toEqual(["b"]);
    expect([...clickRow(new Set(["b"]), ids, "b", false, false, "b")]).toEqual([]);
  });

  it("selects a range with Shift, either way from the anchor", () => {
    expect([...clickRow(new Set(["b"]), ids, "d", true, true, "b")].sort()).toEqual([
      "b",
      "c",
      "d",
    ]);
    expect([...clickRow(new Set(["d"]), ids, "a", true, true, "d")].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("clears a range with Shift", () => {
    expect([...clickRow(new Set(ids), ids, "c", false, true, "a")].sort()).toEqual(["d", "e"]);
  });

  it("ignores an anchor from another list", () => {
    expect([...clickRow(new Set(), ids, "c", true, true, "x")]).toEqual(["c"]);
  });

  it("gives the header's state, and selects all, then none", () => {
    expect(headerState(new Set(), ids)).toBe("none");
    expect(headerState(new Set(["a", "x"]), ids)).toBe("some");
    const all = clickHeader(new Set(["a", "x"]), ids);
    expect(headerState(all, ids)).toBe("all");
    expect([...clickHeader(all, ids)]).toEqual(["x"]);
  });
});
