import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * The accessibility gate (spec, "Accessibility"): axe's WCAG 2.2 A and AA rules
 * on the page as it is now. Call it once per screen and state (a dialog open,
 * errors shown). Any violation fails the test.
 *
 * `except` turns rules off for this one scan only, each with the reason it
 * doesn't apply, and a test nearby that shows it.
 */
export async function expectAccessible(
  page: Page,
  except: Record<string, string> = {},
): Promise<void> {
  // A part still fading or sliding in has its colours mid-way.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .disableRules(Object.keys(except))
    .analyze();
  const violations = results.violations.map((violation) => ({
    rule: violation.id,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));
  expect(violations).toEqual([]);
}

/**
 * A Base UI Combobox with its list open hides the rest of the page from
 * assistive tech, and closes the list as soon as focus leaves the input, so
 * nothing hidden can be focused while it is hidden.
 */
export const comboboxListOpen = {
  "aria-hidden-focus":
    "Base UI hides the page only while the list is open, and leaving the input closes it",
};
