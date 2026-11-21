import type { CategoryNode } from "../lib/categories";

const node = (
  id: string,
  name: string,
  kind: string,
  parent?: string,
  children?: CategoryNode[],
): CategoryNode => ({
  category_id: id,
  name,
  kind,
  ...(parent === undefined ? {} : { parent_id: parent }),
  ...(children === undefined ? {} : { children }),
});

/** A small Category tree for tests, sorted by name as the API sorts it. */
export const categoryTree: CategoryNode[] = [
  node("food", "Food", "EXPENSE", undefined, [
    node("eating-out", "Eating out", "EXPENSE", "food", [
      node("coffee", "Coffee", "EXPENSE", "eating-out"),
    ]),
    node("groceries", "Groceries", "EXPENSE", "food"),
  ]),
  node("transfer", "Household transfer", "INTERNAL"),
  node("opening", "Opening balance", "INTERNAL"),
  node("salary", "Salary", "INCOME"),
  node("transport", "Transport", "EXPENSE"),
  node("uncategorised", "Uncategorised", "INTERNAL"),
];
