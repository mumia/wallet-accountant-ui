import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";
import { forceCategory } from "./force-category";

// Home in the default mock scenario (src/mocks/db.ts). Each test adds its own
// cash Account, Wallet, counted at €40.00.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";

const toast = (page: Page, text: string) => page.getByRole("dialog").filter({ hasText: text });
const sheetOf = (page: Page) => page.getByRole("dialog", { name: "Record a Transaction" });

/** Adds Wallet, started on `startDate`, and opens its Transactions. */
async function addWallet(page: Page, startDate: string) {
  await page.goto(home);
  // The mock API serves the page once it shows.
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  const walletId = await page.evaluate(
    async ({ path, start }) => {
      const response = await fetch(`/api${path}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: `{"name":"Wallet","kind":"CASH","currency":"EUR","start_date":"${start}","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
      });
      return ((await response.json()) as { account_id: string }).account_id;
    },
    { path: home, start: startDate },
  );
  const wallet = `${home}/accounts/${walletId}`;
  await page.goto(`${wallet}/transactions`);
  // The mock API serves the new page once it shows.
  await expect(page.getByRole("heading", { level: 1, name: "Wallet" })).toBeVisible();
  return wallet;
}

async function pickOtherSide(page: Page, category: string) {
  const picker = sheetOf(page).getByRole("combobox", { name: "Other side" });
  await picker.fill(category.split(" › ").at(-1) ?? category);
  await page.getByRole("option", { name: category, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

test("recording spending, income and Uncategorised cash", async ({ page }) => {
  await addWallet(page, "2026-11-01");
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);

  await expect(sheet).toHaveAccessibleDescription("Cash paid or received from Wallet, in EUR.");
  const amount = sheet.getByRole("textbox", { name: "Amount (EUR)" });
  await expect(amount).toHaveAccessibleDescription("Use a minus for money out, e.g. -2.50");
  const date = sheet.getByRole("textbox", { name: "Date" });
  await expect(date).toHaveValue("11/22/2026");
  await expect(sheet.getByRole("button", { name: "Close" })).toBeVisible();
  await expectAccessible(page);

  // Spending, saved with Enter: Save and add another.
  await amount.fill("-2.50");
  await pickOtherSide(page, "Food › Groceries");
  await date.fill("11/20/2026");
  await sheet.getByRole("textbox", { name: "Description" }).fill("Coffee");
  await sheet.getByRole("textbox", { name: "Payee (optional)" }).fill("Café Central");
  await sheet.getByRole("textbox", { name: "Payee (optional)" }).press("Enter");

  await expect(toast(page, "Recorded: Coffee, -€2.50")).toBeVisible();
  // The sheet stays, with the date kept and the rest cleared.
  await expect(amount).toBeFocused();
  await expect(amount).toHaveValue("");
  await expect(sheet.getByRole("combobox", { name: "Other side" })).toHaveValue("");
  await expect(sheet.getByRole("textbox", { name: "Description" })).toHaveValue("");
  await expect(date).toHaveValue("11/20/2026");
  // Behind the sheet, which hides the page from assistive tech while it's open.
  await expect(page.locator("tbody tr").filter({ hasText: /Coffee.*-€2\.50/ })).toBeAttached();

  // Income, saved with Save, which closes the sheet.
  await amount.fill("100");
  await pickOtherSide(page, "Salary");
  await sheet.getByRole("textbox", { name: "Description" }).fill("Sold the bike");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(toast(page, "Recorded: Sold the bike, €100.00")).toBeVisible();

  // No Category is Uncategorised.
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-1");
  await sheet.getByRole("textbox", { name: "Description" }).fill("Parking");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();

  // Each row's Category is its picker's value.
  const category = (row: string) => page.getByRole("combobox", { name: `Category for ${row}` });
  await expect(category("Nov 20, 2026, Coffee, -€2.50")).toHaveValue("Food › Groceries");
  await expect(category("Nov 20, 2026, Sold the bike, €100.00")).toHaveValue("Salary");
  await expect(category("Nov 22, 2026, Parking, -€1.00")).toHaveValue("Uncategorised");
  await expect(page.getByText("Cash · EUR · €136.50")).toBeVisible();
  await expectAccessible(page);
});

test("a sign flip clears a Category that no longer fits", async ({ page }) => {
  await addWallet(page, "2026-11-01");
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);
  const amount = sheet.getByRole("textbox", { name: "Amount (EUR)" });
  const picker = sheet.getByRole("combobox", { name: "Other side" });

  await amount.fill("-5");
  await pickOtherSide(page, "Food › Groceries");
  await expect(picker).toHaveValue("Food › Groceries");
  await amount.fill("5");

  await expect(picker).toHaveValue("");
  await expect(picker).toHaveAccessibleDescription(
    /Food › Groceries was cleared: Expense Categories are for money out\./,
  );
  await picker.click();
  await expect(page.getByRole("option", { name: "Salary" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Food › Groceries" })).toHaveCount(0);
  await expectAccessible(page, comboboxListOpen);
});

test("a date before the open month is refused", async ({ page }) => {
  // Wallet started in October, which has ended and closes.
  const wallet = await addWallet(page, "2026-10-15");
  const closed = await page.evaluate(async (path) => {
    const response = await fetch(`/api${path}/months/2026-10/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"statement_balance":{"amount":40.00,"currency":"EUR"},"counted_on":"2026-11-01"}',
    });
    return `${String(response.status)} ${await response.text()}`;
  }, wallet);
  expect(closed).toMatch(/^200 /);
  await page.reload();

  // November, the open month, has nothing yet.
  await expect(page.getByText("No Transactions in November 2026 yet")).toBeVisible();
  await page.getByRole("button", { name: "Record one" }).click();
  const sheet = sheetOf(page);
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-3");
  await sheet.getByRole("textbox", { name: "Description" }).fill("Bus ticket");
  const date = sheet.getByRole("textbox", { name: "Date" });

  // The calendar offers nothing before November.
  await sheet.getByRole("button", { name: "Choose a date" }).click();
  await expect(page.getByRole("button", { name: /November 1, 2026/ })).toBeEnabled();
  await page.keyboard.press("Escape");

  await date.fill("10/31/2026");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();

  await expect(date).toHaveAccessibleDescription(
    "The months before November 2026 are closed: pick November 1, 2026 or later",
  );
  await expect(sheet).toBeVisible();
  await expectAccessible(page);

  await date.fill("11/02/2026");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("row", { name: /Bus ticket/ })).toBeVisible();
});

test("a cash Counterpart that hadn't started by the date is refused", async ({ page }) => {
  await addWallet(page, "2026-11-01");
  const purse = await page.evaluate(async (path) => {
    const response = await fetch(`/api${path}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"name":"Purse","kind":"CASH","currency":"EUR","start_date":"2026-11-20","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}',
    });
    return response.status;
  }, home);
  expect(purse).toBe(201);
  await page.reload();

  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-15");
  await pickOtherSide(page, "Transfer to Purse");
  await sheet.getByRole("textbox", { name: "Description" }).fill("For the market");
  const date = sheet.getByRole("textbox", { name: "Date" });
  await date.fill("11/10/2026");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();

  const picker = sheet.getByRole("combobox", { name: "Other side" });
  await expect(picker).toHaveAccessibleDescription(
    /Purse starts on November 20, 2026: pick that date or later, or another Account/,
  );
  await expect(sheet).toBeVisible();
  await expectAccessible(page);

  // Purse's start date fits, and the message goes with the new date.
  await date.fill("11/20/2026");
  await expect(picker).not.toHaveAccessibleDescription(/Purse starts on/);
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("row", { name: /For the market/ })).toBeVisible();
});

test("a server problem shows in the sheet, with the input kept", async ({ page }) => {
  const wallet = await addWallet(page, "2026-10-15");
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-3");
  await sheet.getByRole("textbox", { name: "Description" }).fill("Bus ticket");
  await sheet.getByRole("textbox", { name: "Date" }).fill("10/20/2026");

  // Another member closes October meanwhile.
  await page.evaluate(async (path) => {
    await fetch(`/api${path}/months/2026-10/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"statement_balance":{"amount":40.00,"currency":"EUR"},"counted_on":"2026-11-01"}',
    });
  }, wallet);
  await sheet.getByRole("button", { name: "Save", exact: true }).click();

  await expect(sheet.getByRole("alert")).toContainText("Month closed");
  await expect(sheet.getByRole("alert")).toContainText("October 2026 is closed.");
  await expect(sheet.getByRole("textbox", { name: "Description" })).toHaveValue("Bus ticket");
  await expect(sheet.getByRole("textbox", { name: "Amount (EUR)" })).toHaveValue("-3.00");
  await expectAccessible(page);
});

test("a Category the server refuses for the amount's sign shows in the sheet", async ({ page }) => {
  await addWallet(page, "2026-11-01");
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-2.50");
  await pickOtherSide(page, "Food › Groceries");
  await sheet.getByRole("textbox", { name: "Description" }).fill("Coffee");

  // An Income Category on money out, past the picker.
  await forceCategory(page, home, "Salary");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();

  await expect(sheet.getByRole("alert")).toContainText("Category doesn't fit the amount");
  await expect(sheet.getByRole("alert")).toContainText(
    "An Income Category takes only money in, and this amount is money out.",
  );
  await expect(sheet.getByRole("textbox", { name: "Description" })).toHaveValue("Coffee");
  await expectAccessible(page);
});
