import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// Home in the default mock scenario (src/mocks/db.ts), with its statement
// Accounts Main, Credit card and Savings, all in EUR. Each test adds its own
// cash Accounts, counted at €40.00 on November 1, 2026.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";

const sheetOf = (page: Page) => page.getByRole("dialog", { name: "Record a Transaction" });
const rowOf = (page: Page, text: string) => page.locator("tbody tr").filter({ hasText: text });

/** Adds a cash Account, returning its path. */
async function addCash(page: Page, name: string) {
  return page.evaluate(
    async ({ path, account }) => {
      const response = await fetch(`/api${path}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: `{"name":"${account}","kind":"CASH","currency":"EUR","start_date":"2026-11-01","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
      });
      const { account_id } = (await response.json()) as { account_id: string };
      return `${path}/accounts/${account_id}`;
    },
    { path: home, account: name },
  );
}

/** Opens Home, so the mock API serves the page, and adds the cash Accounts. */
async function start(page: Page, ...names: string[]) {
  await page.goto(home);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  const paths: string[] = [];
  for (const name of names) {
    paths.push(await addCash(page, name));
  }
  return paths;
}

async function openTransactions(page: Page, path: string, name: string) {
  await page.goto(`${path}/transactions`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

test("an ATM withdrawal noted in Wallet stays In transit, and the filter finds it", async ({
  page,
}) => {
  const [wallet = ""] = await start(page, "Wallet");
  await openTransactions(page, wallet, "Wallet");
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);
  const picker = sheet.getByRole("combobox", { name: "Other side" });

  // With no amount yet, a Transfer goes neither way; every other EUR Account is offered.
  await picker.click();
  const transfers = page.getByRole("group", { name: "Transfer" }).getByRole("option");
  await expect(transfers).toHaveText([
    "Transfer · Main",
    "Transfer · Credit card",
    "Transfer · Savings",
  ]);
  await page.keyboard.press("Escape");

  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("50");
  await picker.fill("main");
  await page.getByRole("option", { name: "Transfer from Main" }).click();
  await expect(picker).toHaveValue("Transfer from Main");
  await expect(picker).toHaveAccessibleDescription(
    /This stays In transit until Main's statement row is Accepted as this Transfer\./,
  );
  await sheet.getByRole("textbox", { name: "Description" }).fill("ATM");
  await expectAccessible(page);

  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();

  // A leg (so counterpart_account_id went out): its Category fixed text, with the badge.
  const leg = rowOf(page, "ATM");
  await expect(leg).toContainText("Transfer from Main");
  await expect(leg.getByText("In transit", { exact: true })).toBeVisible();
  await expect(leg.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("Cash · EUR · €90.00")).toBeVisible();
  await expectAccessible(page);

  // The filter: only the leg.
  await page.getByRole("button", { name: "In transit only (1)" }).click();
  await expect(page).toHaveURL(/in_transit=true/);
  await expect(page.getByRole("button", { name: "In transit only (1)" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(rowOf(page, "ATM")).toBeVisible();
  await expectAccessible(page);

  // Pressing Uncategorised only releases it.
  await page.getByRole("button", { name: /Uncategorised only/ }).click();
  await expect(page).not.toHaveURL(/in_transit/);

  // All months has no filter.
  await page.getByRole("combobox", { name: "Month" }).click();
  await page.getByRole("option", { name: "All months" }).click();
  await expect(page.getByRole("button", { name: "In transit only" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "In transit only" })).toHaveAccessibleDescription(
    "Choose a month first",
  );

  // The month counts it, and links to the filter.
  await page.goto(`${wallet}/months/2026-11`);
  await page.getByRole("link", { name: "1 Transfer leg In transit" }).click();
  await expect(page).toHaveURL(/booking_month=2026-11&in_transit=true/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("cash ↔ cash shows on both Accounts, Matched, and links across", async ({ page }) => {
  const [wallet = "", purse = ""] = await start(page, "Wallet", "Purse");
  await openTransactions(page, purse, "Purse");
  // Purse's list is read before the Transfer, so it must refetch after it.
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await openTransactions(page, wallet, "Wallet");

  await page.getByRole("button", { name: "Record a Transaction" }).click();
  const sheet = sheetOf(page);
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-15");
  const picker = sheet.getByRole("combobox", { name: "Other side" });
  await picker.fill("purse");
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "Transfer to Purse" }).click();
  // No In transit note for a cash Counterpart.
  await expect(picker).not.toHaveAccessibleDescription(/In transit/);
  await sheet.getByRole("textbox", { name: "Description" }).fill("For the market");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();

  const own = rowOf(page, "For the market");
  await expect(own).toContainText("Transfer to Purse");
  await expect(own.getByText("In transit", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "In transit only (0)" })).toBeVisible();

  // The Counterpart's name links to its Transactions, in the leg's month.
  await own.getByRole("link", { name: "Purse" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Purse" })).toBeVisible();
  await expect(page).toHaveURL(/booking_month=2026-11/);
  const theirs = rowOf(page, "For the market");
  await expect(theirs).toContainText("Transfer from Wallet");
  await expect(theirs).toContainText("€15.00");
  await expect(theirs.getByText("In transit", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Cash · EUR · €55.00")).toBeVisible();
  await expectAccessible(page);
});
