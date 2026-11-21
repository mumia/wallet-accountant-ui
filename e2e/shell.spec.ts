import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The default mock scenario (src/mocks/db.ts): "Home" with Main (a balance) and
// Credit card (awaiting its first Statement import), and "Cabin" with no Accounts.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const cabin = "/households/0190f5f2-7c00-7000-8000-000000000002";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;

const navigation = (page: Page) => page.getByRole("navigation", { name: "Household" });

async function switchHousehold(page: Page, name: string) {
  await page.getByRole("button", { name: /^Household/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

/** The page never scrolls sideways (320 px reflow, 200% zoom). */
async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("the Accounts overview lists each Account with its balance", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(home);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "Main" })).toContainText(
    ["Bank account", "EUR", "€1,234.50"].join(""),
  );
  await expect(rows.filter({ hasText: "Credit card" })).toContainText(
    "Awaiting first Statement import",
  );
  await expect(navigation(page).getByRole("link", { name: /Main.*€1,234\.50/ })).toBeVisible();
  await expect(navigation(page).getByRole("link", { name: "Accounts overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectAccessible(page);
});

test("switching Households changes the URL, and back and forward work", async ({ page }) => {
  await page.goto(home);
  await page.getByRole("button", { name: /^Household/ }).click();
  await expect(page.getByRole("menuitemradio", { name: "Home" })).toBeChecked();
  await expectAccessible(page);
  await page.getByRole("menuitemradio", { name: "Cabin" }).click();

  await expect(page).toHaveURL(cabin);
  await expect(page.getByText("Add your first Account.")).toBeVisible();
  await expect(navigation(page).getByRole("button", { name: "Add Account" })).toBeVisible();
  await expectAccessible(page);

  await page.goBack();
  await expect(page).toHaveURL(home);
  await expect(page.getByRole("row").filter({ hasText: "Main" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(cabin);
  await expect(page.getByText("Add your first Account.")).toBeVisible();

  // `/` goes back to the Household last opened.
  await page.goto("/");
  await expect(page).toHaveURL(cabin);
});

test("Create Household from the switcher opens the new Household", async ({ page }) => {
  await page.goto(home);
  await page.getByRole("button", { name: /^Household/ }).click();
  await page.getByRole("menuitem", { name: "Create Household…" }).click();

  const dialog = page.getByRole("dialog", { name: "Create Household" });
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
  await dialog.getByRole("textbox", { name: "Name" }).fill("Allotment");
  await dialog.getByRole("combobox", { name: "Base currency" }).fill("GBP");
  await page.getByRole("option", { name: "GBP — British Pound" }).click();
  await dialog.getByRole("button", { name: "Create Household" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/households\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: /^Household/ })).toContainText("Allotment");
  await expect(page.getByText("Add your first Account.")).toBeVisible();
});

test("Add Account opens its dialog from the overview and the sidebar", async ({ page }) => {
  await page.goto(cabin);

  await page.getByRole("main").getByRole("button", { name: "Add Account" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Account" });
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await navigation(page).getByRole("button", { name: "Add Account" }).click();
  await expect(dialog).toBeVisible();
});

test("the sidebar leads to each Account and to Categories", async ({ page }) => {
  await page.goto(home);

  await navigation(page).getByRole("link", { name: /Main/ }).click();
  await expect(page).toHaveURL(main);
  await expect(page.getByRole("heading", { level: 1, name: "Main" })).toBeVisible();
  await expect(navigation(page).getByRole("link", { name: /Main/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectAccessible(page);

  await navigation(page).getByRole("link", { name: "Categories" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Categories" })).toBeVisible();
});

test("the User menu shows who is signed in and opens Appearance…", async ({ page }) => {
  await page.goto(home);
  const userMenu = page.getByRole("button", { name: /^Sam Example/ });

  await userMenu.click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("menuitem", { name: "Appearance…" }).click();

  await expect(page.getByRole("dialog", { name: "Appearance" })).toBeVisible();
});

test("a link to something the User can't see is not found, inside the shell", async ({ page }) => {
  await page.goto(`${home}/accounts/0190f5f2-7c00-7000-8000-00000000dead`);

  await expect(page.getByRole("heading", { level: 1, name: "Not found" })).toBeVisible();
  await expect(navigation(page)).toBeVisible();
  await expectAccessible(page);

  await page.goto(`${home}/no-such-page`);
  await expect(page.getByRole("heading", { level: 1, name: "Not found" })).toBeVisible();
});

test("a screen that fails to load says so, and Try again loads it", async ({ page }) => {
  // Every read attempt fails (three, with the retries); the next one succeeds.
  await page.goto(`${main}?mock-fail=000000000101:3`);

  await expect(page.getByRole("alert")).toContainText("Service Unavailable", { timeout: 15_000 });
  await expect(navigation(page)).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Main" })).toBeVisible();
});

test("keyboard focus is never hidden by the sidebar", async ({ page }) => {
  await page.goto(home);
  const sidebarRight = await page
    .locator("[data-slot=sidebar-container]")
    .evaluate((element) => element.getBoundingClientRect().right);

  for (let step = 0; step < 15; step += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      // Tabbing past the last control leaves the page.
      if (element === null || element === document.body) {
        return null;
      }
      const box = element.getBoundingClientRect();
      return {
        what: `${element.tagName} ${element.textContent}`,
        inSidebar: element.closest("[data-slot=sidebar]") !== null,
        left: box.left,
      };
    });
    if (focused !== null && !focused.inSidebar) {
      expect(focused.left, focused.what).toBeGreaterThanOrEqual(sidebarRight);
    }
  }
});

test.describe("on a narrow screen (320 px, or 200% zoom)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("the sidebar is a drawer and nothing scrolls sideways", async ({ page }) => {
    await page.goto(home);

    await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
    await expect(navigation(page)).toBeHidden();
    await expectNoSidewaysScroll(page);
    await expectAccessible(page);

    await page.getByRole("button", { name: "Show or hide navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await expectAccessible(page);
    await drawer.getByRole("link", { name: /Main/ }).click();

    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(main);
    await expectNoSidewaysScroll(page);
  });

  test("switching Households works from the drawer", async ({ page }) => {
    await page.goto(home);
    await page.getByRole("button", { name: "Show or hide navigation" }).click();
    await switchHousehold(page, "Cabin");

    await expect(page).toHaveURL(cabin);
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeHidden();
  });
});

test.describe("at 200% zoom on a laptop (640 px wide)", () => {
  test.use({ viewport: { width: 640, height: 400 } });

  test("the overview reflows without scrolling sideways", async ({ page }) => {
    await page.goto(home);
    await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
    await expectNoSidewaysScroll(page);
    await expectAccessible(page);
  });
});
