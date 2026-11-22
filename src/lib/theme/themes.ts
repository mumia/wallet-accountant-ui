// The four presets × light and dark (spec, "Look and feel"): eight token
// profiles, each tuned to WCAG 2.2 AA on its own (themes.test.ts checks every
// pair). A profile starts from its scheme's neutral base and overrides what its
// preset changes; any token may be overridden where tuning needs it.

export const presetKeys = ["ledger", "teal", "ink", "warm"] as const;
export type PresetKey = (typeof presetKeys)[number];
export type Scheme = "light" | "dark";

export const tokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "positive",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;
export type TokenName = (typeof tokenNames)[number];
export type Tokens = Record<TokenName, string>;

export interface Preset {
  key: PresetKey;
  /** The message key of its name ("Ledger"). */
  font: string;
  radius: string;
}

export const presets: Record<PresetKey, Preset> = {
  ledger: { key: "ledger", font: "Inter Variable", radius: "0.375rem" },
  teal: { key: "teal", font: "IBM Plex Sans Variable", radius: "0.625rem" },
  ink: { key: "ink", font: "Geist Variable", radius: "0.625rem" },
  warm: { key: "warm", font: "Nunito Sans Variable", radius: "0.95rem" },
};

const neutral: Record<Scheme, Tokens> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.5 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.5 0.2 27)",
    positive: "oklch(0.48 0.12 150)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.6 0 0)",
    ring: "oklch(0.205 0 0)",
    sidebar: "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.145 0 0)",
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.95 0 0)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.922 0 0)",
    "sidebar-ring": "oklch(0.205 0 0)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.74 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.74 0.16 22)",
    positive: "oklch(0.75 0.14 150)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(0.55 0 0)",
    ring: "oklch(0.8 0 0)",
    sidebar: "oklch(0.205 0 0)",
    "sidebar-foreground": "oklch(0.985 0 0)",
    "sidebar-primary": "oklch(0.922 0 0)",
    "sidebar-primary-foreground": "oklch(0.205 0 0)",
    "sidebar-accent": "oklch(0.269 0 0)",
    "sidebar-accent-foreground": "oklch(0.985 0 0)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.8 0 0)",
  },
};

/** The accent a preset puts on primary actions, focus rings and the sidebar's active item. */
function accent(color: string, onColor: string): Partial<Tokens> {
  return {
    primary: color,
    "primary-foreground": onColor,
    ring: color,
    "sidebar-primary": color,
    "sidebar-primary-foreground": onColor,
    "sidebar-ring": color,
  };
}

const overrides: Record<PresetKey, Record<Scheme, Partial<Tokens>>> = {
  ledger: { light: {}, dark: {} },
  teal: {
    light: accent("oklch(0.5 0.09 185)", "oklch(0.985 0 0)"),
    dark: accent("oklch(0.74 0.11 182)", "oklch(0.2 0.03 185)"),
  },
  ink: {
    light: accent("oklch(0.51 0.23 277)", "oklch(0.985 0 0)"),
    dark: accent("oklch(0.72 0.15 277)", "oklch(0.18 0.03 277)"),
  },
  warm: {
    light: accent("oklch(0.52 0.15 45)", "oklch(0.99 0 0)"),
    dark: accent("oklch(0.76 0.14 55)", "oklch(0.2 0.03 50)"),
  },
};

export function themeTokens(preset: PresetKey, scheme: Scheme): Tokens {
  return { ...neutral[scheme], ...overrides[preset][scheme] };
}
