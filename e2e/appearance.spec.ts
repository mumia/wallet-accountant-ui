import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

const html = (page: Page) => page.locator("html");

async function openAppearance(page: Page) {
  await page.getByRole("button", { name: /^Sam Example/ }).click();
  await page.getByRole("menuitem", { name: "Appearance…" }).click();
  return page.getByRole("dialog", { name: "Appearance" });
}

test("starts on Ledger in dark, in the mock Household", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect(html(page)).toHaveAttribute("data-preset", "ledger");
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await expectAccessible(page);
});

test("changes the theme live and keeps it after a reload", async ({ page }) => {
  await page.goto("/");
  const dialog = await openAppearance(page);
  await expectAccessible(page);

  await dialog.getByRole("radio", { name: "Ink" }).check();
  await dialog.getByRole("radio", { name: "Light" }).check();
  await expect(html(page)).toHaveAttribute("data-preset", "ink");
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect(html(page)).toHaveAttribute("data-preset", "ink");
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
});

test("follows the system with System", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const dialog = await openAppearance(page);

  await dialog.getByRole("radio", { name: "System" }).check();
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html(page)).toHaveClass(/\bdark\b/);
});

test("works when browser storage refuses the app's data, without remembering", async ({ page }) => {
  // Storage refuses every key of the app's own. MSW, which stands in for the
  // backend in e2e, keeps its own bookkeeping in localStorage unguarded, so its
  // keys still work. A localStorage that throws on any access is unit-tested
  // (src/lib/theme/appearance.test.ts).
  await page.addInitScript(() => {
    const ours = (key: string) => key.startsWith("wallet-accountant.") || key.startsWith("oidc.");
    const refuse = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    const real = window.localStorage;
    const guarded = new Proxy(real, {
      get(target, property) {
        if (property === "getItem") {
          return (key: string) => (ours(key) ? refuse() : target.getItem(key));
        }
        if (property === "setItem") {
          return (key: string, value: string) => {
            if (ours(key)) {
              refuse();
            }
            target.setItem(key, value);
          };
        }
        const value: unknown = Reflect.get(target, property);
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    Object.defineProperty(window, "localStorage", { get: () => guarded });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const dialog = await openAppearance(page);

  await dialog.getByRole("radio", { name: "Teal" }).check();
  await expect(html(page)).toHaveAttribute("data-preset", "teal");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect(html(page)).toHaveAttribute("data-preset", "ledger");
  expect(errors).toEqual([]);
});

for (const preset of ["ledger", "teal", "ink", "warm"]) {
  for (const scheme of ["light", "dark"]) {
    test(`passes axe in ${preset} ${scheme}, with the dialog open`, async ({ page }) => {
      await page.addInitScript((saved) => {
        window.localStorage.setItem("wallet-accountant.appearance", saved);
      }, JSON.stringify({ preset, scheme }));
      await page.goto("/");
      await expect(html(page)).toHaveAttribute("data-preset", preset);
      await expectAccessible(page);

      await openAppearance(page);
      await expectAccessible(page);
    });
  }
}
