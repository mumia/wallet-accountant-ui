import { describe, expect, it } from "vitest";

import { categoryTree } from "../test/categories";
import {
  commonSign,
  fitsSign,
  flattenCategories,
  isUncategorised,
  selfAndDescendants,
  signOf,
} from "./categories";

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

describe("the sign rule", () => {
  it.each([
    ["-12.35", "out"],
    ["-0.01", "out"],
    ["15.00", "in"],
    ["0.000001", "in"],
    ["0", undefined],
    ["0.00", undefined],
    ["-0.00", undefined],
  ] as const)("%s is money %s", (amount, sign) => {
    expect(signOf(amount)).toBe(sign);
  });

  it("finds a selection's one sign, or that it's mixed", () => {
    expect(commonSign(["-1.00", "-2.00"])).toBe("out");
    expect(commonSign(["1.00", "0.00", "2.00"])).toBe("in");
    expect(commonSign(["-1.00", "2.00"])).toBe("mixed");
    expect(commonSign([])).toBeUndefined();
  });

  it("fits Expense to money out, Income to money in, and the rest both ways", () => {
    const fits = (kind: string) =>
      (["out", "in", undefined] as const).map((sign) => fitsSign({ kind }, sign));

    expect(fits("EXPENSE")).toEqual([true, false, true]);
    expect(fits("INCOME")).toEqual([false, true, true]);
    expect(fits("INTERNAL")).toEqual([true, true, true]);
  });
});
