import { describe, expect, it } from "vitest";

import { categoryTree } from "../test/categories";
import { flattenCategories, isUncategorised, selfAndDescendants } from "./categories";

describe("the Category tree", () => {
  it("flattens in tree order with each Category's path and depth", () => {
    const flat = flattenCategories(categoryTree);

    expect(flat.map(({ path }) => path.join(" › "))).toEqual([
      "Account transfer",
      "Food",
      "Food › Eating out",
      "Food › Eating out › Coffee",
      "Food › Groceries",
      "Household transfer",
      "Opening balance",
      "Salary",
      "Transport",
      "Uncategorised",
    ]);
    expect(flat.find(({ id }) => id === "coffee")).toMatchObject({
      depth: 2,
      parentId: "eating-out",
    });
  });

  it("knows Uncategorised by its kind and name", () => {
    expect(isUncategorised({ kind: "INTERNAL", name: "Uncategorised" })).toBe(true);
    expect(isUncategorised({ kind: "EXPENSE", name: "Uncategorised" })).toBe(false);
    expect(isUncategorised({ kind: "INTERNAL", name: "Opening balance" })).toBe(false);
  });

  it("finds a Category and all its sub-Categories", () => {
    expect(selfAndDescendants(categoryTree, "food")).toEqual(
      new Set(["food", "eating-out", "coffee", "groceries"]),
    );
    expect(selfAndDescendants(categoryTree, "salary")).toEqual(new Set(["salary"]));
    expect(selfAndDescendants(categoryTree, "missing")).toEqual(new Set());
  });
});
