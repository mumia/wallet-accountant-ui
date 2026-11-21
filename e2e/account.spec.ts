import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// The default mock scenario (src/mocks/db.ts).
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const cabin = "/households/0190f5f2-7c00-7000-8000-000000000002";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;
const creditCard = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000102`;
const connectionId = "0190f5f2-7c00-7000-8000-000000000201";

/** A date as Playwright's en-US browser shows it: 11/01/2026. */
const usDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
const now = new Date();
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

async function openAddAccount(page: Page) {
  await page.getByRole("main").getByRole("button", { name: "Add Account" }).click();
  return page.getByRole("dialog", { name: "Add Account" });
}

test("adding an Account lands on its getting-started checklist", async ({ page }) => {
  await page.goto(cabin);
  const dialog = await openAddAccount(page);

  await expect(dialog.getByRole("radio", { name: "Bank account" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /Cash/ })).toHaveCount(0);
  // Cabin's Base currency.
  await expect(dialog.getByRole("combobox", { name: "Account currency" })).toHaveValue(
    "USD — US Dollar",
  );
  const start = dialog.getByRole("textbox", { name: "Start date" });
  await expect(start).toHaveValue(usDate(firstOfMonth));
  await expect(start).toHaveAccessibleDescription(/rows booked before it are ignored/);
  await expectAccessible(page);

  await dialog.getByRole("textbox", { name: "Name" }).fill("Visa");
  await dialog.getByRole("radio", { name: "Credit card" }).check();
  await dialog.getByRole("button", { name: "Add Account" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`^.*${cabin}/accounts/[0-9a-f-]{36}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Visa" })).toBeVisible();
  await expect(page.getByText("Credit card · USD · Awaiting first Statement import")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Get started" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a Connection" })).toBeVisible();
  const importFirst = page.getByRole("button", { name: "Import the first statement" });
  await expect(importFirst).toBeDisabled();
  await expect(importFirst).toHaveAccessibleDescription("Create a Connection first.");
  // Header and tabs stay, none selected.
  await expect(page.getByRole("link", { name: "Import statement" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Account" }).locator("[aria-current=page]"),
  ).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Household" })).toContainText("Visa");
  await expectAccessible(page);
});

test("the Add Account dialog works from the keyboard and checks its fields", async ({ page }) => {
  await page.goto(cabin);
  await page.getByRole("main").getByRole("button", { name: "Add Account" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add Account" });
  await expect(dialog.getByRole("textbox", { name: "Name" })).toBeFocused();

  // Kind: arrows move within the radio group.
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("radio", { name: "Bank account" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("radio", { name: "Credit card" })).toBeChecked();

  // Start date: a later day than today is refused.
  const start = dialog.getByRole("textbox", { name: "Start date" });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  await start.fill(usDate(tomorrow));
  await dialog.getByRole("button", { name: "Add Account" }).click();
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveAccessibleDescription(
    "Give the Account a name",
  );
  await expect(start).toHaveAccessibleDescription(/can't be later than today/);
  await expectAccessible(page);

  // The calendar: it opens on the chosen day, and arrows and Enter pick another.
  await start.fill(usDate(firstOfMonth));
  await dialog.getByRole("button", { name: "Choose a date" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  // The chosen day has focus.
  await expect(page.locator("button[data-day]:focus")).toHaveCount(1);
  await expectAccessible(page);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("grid")).toBeHidden();
  const lastOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  await expect(start).toHaveValue(usDate(lastOfPreviousMonth));

  // The currency: searchable.
  const currency = dialog.getByRole("combobox", { name: "Account currency" });
  await currency.fill("eth");
  await expect(page.getByRole("option", { name: "ETH" })).toBeVisible();
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "ETH" }).click();
  await expect(currency).toHaveValue("ETH");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("with a Connection, the first statement can be imported", async ({ page }) => {
  await page.goto(creditCard);

  await expect(page.getByText("Connection created.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Create a Connection (done)" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Import the first statement" }).click();

  await expect(page).toHaveURL(`${creditCard}/statement-imports/new?connection_id=${connectionId}`);
  await expectAccessible(page);
});

test("an Account with statements opens on Transactions, and tabs keep the month", async ({
  page,
}) => {
  await page.goto(main);

  await expect(page).toHaveURL(`${main}/transactions`);
  const tabs = page.getByRole("navigation", { name: "Account" });
  await expect(tabs.getByRole("link", { name: "Transactions" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectAccessible(page);

  await page.goto(`${main}/transactions?booking_month=2026-03`);
  await tabs.getByRole("link", { name: "To review" }).click();
  await expect(page).toHaveURL(`${main}/to-review?booking_month=2026-03`);
  await tabs.getByRole("link", { name: "Months" }).click();
  await expect(page).toHaveURL(`${main}/months`);

  for (const tab of ["Statement imports", "Connections"]) {
    await tabs.getByRole("link", { name: tab }).click();
    await expect(page.getByRole("heading", { level: 2, name: tab })).toBeVisible();
  }
  await page.getByRole("link", { name: "Import statement" }).click();
  await expect(page).toHaveURL(`${main}/statement-imports/new`);
});

test.describe("on a narrow screen", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("the Account area and the dialog reflow", async ({ page }) => {
    await page.goto(creditCard);
    await expect(page.getByRole("heading", { level: 2, name: "Get started" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.goto(cabin);
    const dialog = await openAddAccount(page);
    await expect(dialog.getByRole("button", { name: "Add Account" })).toBeInViewport({ ratio: 0 });
    await expectAccessible(page);
  });
});
