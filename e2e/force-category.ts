import type { Page } from "@playwright/test";

/**
 * Sends the page's next request that names a `category_id` with the Category
 * called `name` instead, as an old tab or a race could: past the picker, which
 * offers only Categories that fit the amount's sign. Once only, and only until
 * the page navigates.
 */
export async function forceCategory(page: Page, home: string, name: string): Promise<void> {
  await page.evaluate(
    async ({ path, name }) => {
      interface Node {
        category_id: string;
        name: string;
        children?: Node[];
      }
      const response = await fetch(`/api${path}/categories`);
      const { items } = (await response.json()) as { items: Node[] };
      const find = (nodes: Node[]): string | undefined => {
        for (const node of nodes) {
          const found = node.name === name ? node.category_id : find(node.children ?? []);
          if (found !== undefined) {
            return found;
          }
        }
        return undefined;
      };
      const forced = find(items);
      if (forced === undefined) {
        throw new Error(`No Category called ${name}`);
      }

      const original = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (input instanceof Request && input.method !== "GET") {
          const body = await input.clone().text();
          if (body.includes('"category_id"')) {
            globalThis.fetch = original;
            const swapped = body.replace(/"category_id":"[^"]*"/, `"category_id":"${forced}"`);
            return original(new Request(input, { body: swapped }));
          }
        }
        return original(input, init);
      };
    },
    { path: home, name },
  );
}
