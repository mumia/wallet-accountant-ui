// The User's appearance choice (spec, "Look and feel"): a preset and Light,
// Dark or System, saved in this browser only. Storage can be missing or throw
// (a private window, blocked site data); the app then works with the default
// and simply doesn't remember.
import { useSyncExternalStore } from "react";

import {
  presetKeys,
  presets,
  themeTokens,
  tokenNames,
  type PresetKey,
  type Scheme,
} from "./themes";

export type SchemeChoice = Scheme | "system";
export const schemeChoices = ["light", "dark", "system"] as const satisfies readonly SchemeChoice[];

export interface Appearance {
  preset: PresetKey;
  scheme: SchemeChoice;
}

export const defaultAppearance: Appearance = { preset: "ledger", scheme: "dark" };

const storageKey = "wallet-accountant.appearance";

function isPreset(value: unknown): value is PresetKey {
  return presetKeys.some((key) => key === value);
}

function isSchemeChoice(value: unknown): value is SchemeChoice {
  return schemeChoices.some((choice) => choice === value);
}

export function readAppearance(storage: () => Storage = () => window.localStorage): Appearance {
  try {
    const saved: unknown = JSON.parse(storage().getItem(storageKey) ?? "null");
    if (typeof saved === "object" && saved !== null) {
      const { preset, scheme } = saved as Record<string, unknown>;
      return {
        preset: isPreset(preset) ? preset : defaultAppearance.preset,
        scheme: isSchemeChoice(scheme) ? scheme : defaultAppearance.scheme,
      };
    }
  } catch {
    // Unreadable storage: the default.
  }
  return defaultAppearance;
}

export function saveAppearance(
  appearance: Appearance,
  storage: () => Storage = () => window.localStorage,
): void {
  try {
    storage().setItem(storageKey, JSON.stringify(appearance));
  } catch {
    // Blocked storage: the choice lasts until the page is closed.
  }
}

const darkQuery = "(prefers-color-scheme: dark)";

export function resolveScheme(choice: SchemeChoice, prefersDark: boolean): Scheme {
  if (choice === "system") {
    return prefersDark ? "dark" : "light";
  }
  return choice;
}

/** Puts a choice's tokens, font, radius and colour scheme on <html>. */
export function applyAppearance(
  appearance: Appearance,
  root: HTMLElement,
  prefersDark: boolean,
): void {
  const scheme = resolveScheme(appearance.scheme, prefersDark);
  const tokens = themeTokens(appearance.preset, scheme);
  for (const name of tokenNames) {
    root.style.setProperty(`--${name}`, tokens[name]);
  }
  const preset = presets[appearance.preset];
  root.style.setProperty("--font-sans", `"${preset.font}", system-ui, sans-serif`);
  root.style.setProperty("--radius", preset.radius);
  root.style.colorScheme = scheme;
  root.classList.toggle("dark", scheme === "dark");
  root.dataset["preset"] = appearance.preset;
}

/** The current choice, applied and saved on every change; follows the system with "system". */
function createAppearanceStore() {
  const listeners = new Set<() => void>();
  let current = defaultAppearance;
  const media = () => window.matchMedia(darkQuery);
  const apply = () => {
    applyAppearance(current, document.documentElement, media().matches);
  };
  return {
    /** Reads the saved choice and applies it; call once before the first render. */
    start: () => {
      current = readAppearance();
      apply();
      media().addEventListener("change", apply);
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: () => current,
    set: (next: Appearance) => {
      current = next;
      apply();
      saveAppearance(next);
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

export const appearanceStore = createAppearanceStore();

/** The appearance choice, and a setter that applies and saves it live. */
export function useAppearance(): [Appearance, (next: Appearance) => void] {
  const appearance = useSyncExternalStore(appearanceStore.subscribe, appearanceStore.get);
  return [appearance, appearanceStore.set];
}
