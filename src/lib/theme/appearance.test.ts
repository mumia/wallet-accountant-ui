import { describe, expect, it } from "vitest";

import {
  applyAppearance,
  defaultAppearance,
  readAppearance,
  resolveScheme,
  saveAppearance,
} from "./appearance";
import { themeTokens } from "./themes";

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => {
      items.clear();
    },
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

const blocked = (): Storage => {
  throw new DOMException("Blocked", "SecurityError");
};

describe("the saved appearance", () => {
  it("starts on Ledger in dark", () => {
    expect(readAppearance(memoryStorage)).toEqual({ preset: "ledger", scheme: "dark" });
  });

  it("is remembered", () => {
    const storage = memoryStorage();
    saveAppearance({ preset: "warm", scheme: "system" }, () => storage);

    expect(readAppearance(() => storage)).toEqual({ preset: "warm", scheme: "system" });
  });

  it("falls back to the default for anything it doesn't know", () => {
    const storage = memoryStorage();
    storage.setItem("wallet-accountant.appearance", '{"preset":"neon","scheme":"sepia"}');

    expect(readAppearance(() => storage)).toEqual(defaultAppearance);
  });

  it("works, without remembering, when touching storage throws", () => {
    expect(() => {
      saveAppearance({ preset: "ink", scheme: "light" }, blocked);
    }).not.toThrow();
    expect(readAppearance(blocked)).toEqual(defaultAppearance);
  });
});

describe("applyAppearance", () => {
  it("puts the preset's tokens, font and scheme on <html>", () => {
    const root = document.createElement("html");

    applyAppearance({ preset: "teal", scheme: "light" }, root, true);

    expect(root.dataset["preset"]).toBe("teal");
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
    expect(root.style.getPropertyValue("--primary")).toBe(themeTokens("teal", "light").primary);
    expect(root.style.getPropertyValue("--font-sans")).toContain("IBM Plex Sans Variable");
  });

  it("follows the system with System", () => {
    expect(resolveScheme("system", true)).toBe("dark");
    expect(resolveScheme("system", false)).toBe("light");
    expect(resolveScheme("light", true)).toBe("light");
  });
});
