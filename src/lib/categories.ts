// A Household's Category tree (`GET …/categories`) as the screens use it.
import type { components } from "../api/schema.gen";

export type CategoryNode = components["schemas"]["CategoryNode"];

/** A Category with where it sits in the tree. */
export interface FlatCategory {
  id: string;
  name: string;
  kind: string;
  parentId: string | undefined;
  /** 0 for a root Category. */
  depth: number;
  /** Its own name and its ancestors', root first: ["Food", "Groceries"]. */
  path: string[];
}

/** Every Category in tree order: each one followed by its sub-Categories. */
export function flattenCategories(tree: readonly CategoryNode[]): FlatCategory[] {
  const flat: FlatCategory[] = [];
  const visit = (nodes: readonly CategoryNode[], ancestors: string[]) => {
    for (const node of nodes) {
      const path = [...ancestors, node.name];
      flat.push({
        id: node.category_id,
        name: node.name,
        kind: node.kind,
        parentId: node.parent_id,
        depth: ancestors.length,
        path,
      });
      visit(node.children ?? [], path);
    }
  };
  visit(tree, []);
  return flat;
}

/**
 * The Internal Category rows wait in until they get a Category. Internal
 * Categories are created by the system with fixed names and can't be renamed,
 * so its kind and name identify it.
 */
export function isUncategorised(category: { kind: string; name: string }): boolean {
  return category.kind === "INTERNAL" && category.name === "Uncategorised";
}

/** A Category and all its sub-Categories, at any depth: where it can't be moved to. */
export function selfAndDescendants(tree: readonly CategoryNode[], id: string): Set<string> {
  const ids = new Set<string>();
  const collect = (node: CategoryNode) => {
    ids.add(node.category_id);
    (node.children ?? []).forEach(collect);
  };
  const find = (nodes: readonly CategoryNode[]): void => {
    for (const node of nodes) {
      if (node.category_id === id) {
        collect(node);
        return;
      }
      find(node.children ?? []);
    }
  };
  find(tree);
  return ids;
}
