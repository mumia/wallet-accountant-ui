import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * The accessibility gate (spec, "Accessibility"): axe's WCAG 2.2 A and AA rules
 * on the page as it is now. Call it once per screen and state (a dialog open,
 * errors shown). Any violation fails the test.
 */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = results.violations.map((violation) => ({
    rule: violation.id,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));
  expect(violations).toEqual([]);
}
