import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// Main in the default mock scenario (src/mocks/db.ts): its Opening balance, then
// rent, 22 card payments and salary each month from January to November 2026
// (Bol.com and Tikkie rows Uncategorised), and a reversed pair in October:
// 267 Transactions.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101/transactions`;
const creditCard = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000102/transactions`;

const bodyRows = (page: Page) => page.locator("tbody tr:not([aria-hidden])");
const picker = (page: Page, row: RegExp) => page.getByRole("combobox", { name: row });
const bolMarch3 = /^Category for Mar 3, 2026, Bol\.com, -€4\.20$/;

async function chooseMonth(page: Page, month: string) {
  await page.getByRole("combobox", { name: /^Month/ }).click();
  await page.getByRole("option", { name: month }).click();
}

async function pick(page: Page, row: RegExp, category: string) {
  await picker(page, row).fill(category);
  await page.getByRole("option", { name: category, exact: true }).click();
}

test("all months load page by page; a chosen month loads in full", async ({ page }) => {
  await page.goto(main);

  // Until the backend serves the open month, no month means all months.
  await expect(page.getByRole("combobox", { name: /^Month/ })).toContainText("All months");
  await expect(page.getByRole("status")).toHaveText("Showing 200 Transactions so far");
  const chip = page.getByRole("button", { name: "Uncategorised only" });
  await expect(chip).toBeDisabled();
  await expect(chip).toHaveAccessibleDescription("Choose a month first");
  // Only the rows near the viewport are in the page.
  expect(await bodyRows(page).count()).toBeLessThan(60);
  // The Opening balance's Category is text, not a picker.
  await expect(bodyRows(page).first()).toContainText("Opening balance");
  await expect(bodyRows(page).first().getByRole("combobox")).toHaveCount(0);
  await expectAccessible(page);

  await page.keyboard.press("End");
  await expect(async () => {
    await page.mouse.wheel(0, 20_000);
    await expect(page.getByRole("status")).toHaveText("267 Transactions", { timeout: 1000 });
  }).toPass();
  await expect(async () => {
    await page.mouse.wheel(0, 20_000);
    await expect(bodyRows(page).last()).toContainText("Nov 25, 2026Salary", { timeout: 1000 });
  }).toPass();

  await chooseMonth(page, "March 2026");
  await expect(page).toHaveURL(`${main}?booking_month=2026-03`);
  await expect(bodyRows(page)).toHaveCount(24);
  await expect(bodyRows(page).first()).toContainText("Rent");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page).toHaveURL(`${main}?booking_month=2026-02`);
  await expect(page.getByRole("combobox", { name: /^Month/ })).toContainText("February 2026");
  // A card payment shows its Transaction date under the Booking date.
  await expect(page.getByText("Transaction date: Feb 3, 2026")).toBeVisible();

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page).toHaveURL(`${main}?booking_month=2026-03`);
});

test("changes a Category in its row", async ({ page }) => {
  await page.goto(`${main}?booking_month=2026-03`);

  await expect(picker(page, bolMarch3)).toHaveValue("Uncategorised");
  await picker(page, bolMarch3).fill("groc");
  await expect(page.getByRole("option", { name: "Food › Groceries" })).toBeVisible();
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "Food › Groceries" }).click();
  await expect(picker(page, bolMarch3)).toHaveValue("Food › Groceries");

  await page.reload();
  await expect(picker(page, bolMarch3)).toHaveValue("Food › Groceries");
});

test("a failed save rolls back, with a toast naming the row", async ({ page }) => {
  // The save and its two retries fail.
  await page.goto(`${main}?booking_month=2026-03&mock-fail=PATCH:3`);

  await pick(page, bolMarch3, "Transport");
  await expect(picker(page, bolMarch3)).toHaveValue("Transport");

  const toast = page.getByRole("dialog").filter({ hasText: "wasn't changed" });
  await expect(toast).toContainText("The Category of Mar 3, 2026, Bol.com, -€4.20 wasn't changed", {
    timeout: 10_000,
  });
  await expect(toast).toContainText("Service Unavailable");
  await expect(picker(page, bolMarch3)).toHaveValue("Uncategorised");
  await expectAccessible(page);

  // Toasts are reached from the keyboard with F6.
  await page.keyboard.press("F6");
  await toast.getByRole("button", { name: "Close" }).click();
  await expect(toast).toBeHidden();
});

test("the Uncategorised toggle narrows a month, and keeps rows given a Category", async ({
  page,
}) => {
  await page.goto(`${main}?booking_month=2026-03`);
  const chip = page.getByRole("button", { name: "Uncategorised only (6)" });
  await expect(chip).toHaveAttribute("aria-pressed", "false");

  await chip.click();
  await expect(page).toHaveURL(`${main}?booking_month=2026-03&uncategorised=true`);
  await expect(bodyRows(page)).toHaveCount(6);
  await expectAccessible(page);

  // A row given a Category stays until the filter changes.
  await pick(page, bolMarch3, "Transport");
  await expect(page.getByRole("button", { name: "Uncategorised only (5)" })).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(6);
  await page.getByRole("button", { name: "Uncategorised only (5)" }).click();
  await page.getByRole("button", { name: "Uncategorised only (5)" }).click();
  await expect(bodyRows(page)).toHaveCount(5);

  // Once every row has a Category.
  for (const row of [
    /Mar 4, 2026, Tikkie/,
    /Mar 10, 2026, Bol/,
    /Mar 11, 2026, Tikkie/,
    /Mar 17, 2026, Bol/,
    /Mar 18, 2026, Tikkie/,
  ]) {
    await pick(page, row, "Transport");
  }
  await page.reload();
  await expect(page.getByText("Everything in March 2026 has a Category ✓")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Show all Transactions" }).click();
  await expect(page).toHaveURL(`${main}?booking_month=2026-03`);
  await expect(bodyRows(page)).toHaveCount(24);
});

test("an Account with no Transactions says so", async ({ page }) => {
  await page.goto(`${creditCard}?booking_month=2026-11`);

  await expect(page.getByText("No Transactions in November 2026")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Show all months" }).click();

  await expect(page).toHaveURL(`${creditCard}?booking_month=all`);
  await expect(page.getByText("No Transactions yet.")).toBeVisible();
});
