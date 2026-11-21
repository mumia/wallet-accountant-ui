import { describe, expect, it } from "vitest";

import { contrast, over } from "./contrast";
import { presetKeys, themeTokens, type Scheme, type TokenName } from "./themes";

// Text needs 4.5:1 (WCAG 1.4.3); a control's edge, a checked fill and the
// focus ring need 3:1 against what they sit on (1.4.11). `border` draws only
// decorative lines and is exempt.
const textPairs: [TokenName, TokenName][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["muted-foreground", "popover"],
  ["accent-foreground", "accent"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["positive", "background"],
  ["primary", "background"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];
const controlPairs: [TokenName, TokenName][] = [
  ["input", "background"],
  ["input", "card"],
  ["input", "popover"],
  ["primary", "background"],
  ["primary", "popover"],
  ["ring", "background"],
  ["ring", "popover"],
  ["sidebar-ring", "sidebar"],
];

const profiles = presetKeys.flatMap((preset) =>
  (["light", "dark"] as Scheme[]).map((scheme) => ({ preset, scheme })),
);

describe.each(profiles)("the $preset $scheme theme", ({ preset, scheme }) => {
  const tokens = themeTokens(preset, scheme);

  it.each(textPairs)("has text contrast for %s on %s", (front, back) => {
    expect(contrast(tokens[front], tokens[back])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(controlPairs)("has control contrast for %s on %s", (front, back) => {
    expect(contrast(tokens[front], tokens[back])).toBeGreaterThanOrEqual(3);
  });

  it("has text contrast on a destructive button's tinted background", () => {
    // base-nova's destructive button: bg-destructive/10 (light), /20 (dark).
    const percent = scheme === "light" ? 10 : 20;
    const tint = tokens.destructive.replace(")", ` / ${String(percent)}%)`);
    expect(contrast(tokens.destructive, over(tint, tokens.background))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrast", () => {
  it("matches WCAG's extremes", () => {
    expect(contrast("oklch(0 0 0)", "oklch(1 0 0)")).toBeCloseTo(21, 1);
    expect(contrast("oklch(1 0 0)", "oklch(1 0 0)")).toBeCloseTo(1, 5);
  });
});
