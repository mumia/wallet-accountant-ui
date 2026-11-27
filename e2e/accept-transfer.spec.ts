import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// Main in the default mock scenario (src/mocks/db.ts) has Café de Jaren
// (−€18.00, Nov 19) and Tikkie from Sam (€15.00, Nov 20) Pending in its open
// month, November 2026. Each test adds its own cash Accounts, counted at
// €40.00 on November 1, 2026, and notes any cash legs through the API.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const mainId = "0190f5f2-7c00-7000-8000-000000000101";
const main = `${home}/accounts/${mainId}`;
const toReview = `${main}/to-review?booking_month=2026-11`;

const cafe = "Nov 19, 2026, Café de Jaren, -€18.00";
const tikkie = "Nov 20, 2026, Tikkie from Sam, €15.00";

const rowOf = (page: Page, label: string) =>
  page.getByRole("row").filter({ has: page.getByRole("checkbox", { name: `Select ${label}` }) });
const dialogOf = (page: Page) =>
  page.getByRole("dialog", { name: "Did you already note this in Wallet?" });
const toastOf = (page: Page) => page.getByRole("region", { name: /Notifications/ });

/** Calls the mock API as the page would, returning the JSON answer. */
async function apiCall(page: Page, method: string, path: string, body?: string) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body }),
      });
      return (await response.json()) as { account_id?: string; transaction_id?: string };
    },
    { method, path, body },
  );
}

/** Adds a cash Account, returning its ID. */
async function addCash(page: Page, name: string, currency = "EUR") {
  const account = await apiCall(
    page,
    "POST",
    `${home}/accounts`,
    `{"name":"${name}","kind":"CASH","currency":"${currency}","start_date":"2026-11-01","opening_count":{"amount":40.00,"currency":"${currency}"},"opening_count_confirmation":{"amount":40.00,"currency":"${currency}"}}`,
  );
  return account.account_id ?? "";
}

/** Notes, in the cash Account, a withdrawal from Main, In transit; returns the leg's ID. */
async function noteFromMain(page: Page, cash: string, date: string, description: string) {
  const leg = await apiCall(
    page,
    "POST",
    `${home}/accounts/${cash}/transactions`,
    `{"date":"${date}","amount":{"amount":18,"currency":"EUR"},"description":"${description}","counterpart_account_id":"${mainId}"}`,
  );
  return leg.transaction_id ?? "";
}

/** Opens Home, so the mock API serves the page, and adds Wallet. */
async function start(page: Page) {
  await page.goto(home);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  return addCash(page, "Wallet");
}

async function pickTransfer(page: Page, label: string, option: string) {
  const picker = page.getByRole("combobox", { name: `Category for ${label}` });
  await picker.fill("wallet");
  await page.getByRole("option", { name: option }).click();
  await expect(picker).toHaveValue(option);
}

/** Wallet's Transactions in November, as the member sees them. */
async function walletRows(page: Page, wallet: string) {
  await page.goto(`${home}/accounts/${wallet}/transactions?booking_month=2026-11`);
  await expect(page.getByRole("heading", { level: 1, name: "Wallet" })).toBeVisible();
  return page.locator("tbody tr");
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

test("the row's picker offers cash Accounts in the row's currency, by its sign", async ({
  page,
}) => {
  await start(page);
  await addCash(page, "Purse");
  await addCash(page, "Dollars", "USD");
  await page.goto(toReview);

  await page.getByRole("combobox", { name: `Category for ${cafe}` }).click();
  const transfers = page.getByRole("group", { name: "Transfer" }).getByRole("option");
  await expect(transfers).toHaveText(["Transfer to Wallet", "Transfer to Purse"]);
  await expectAccessible(page, comboboxListOpen);
  await page.keyboard.press("Escape");

  await page.getByRole("combobox", { name: `Category for ${tikkie}` }).click();
  await expect(transfers).toHaveText(["Transfer from Wallet", "Transfer from Purse"]);
  await page.keyboard.press("Escape");

  // Bulk "Accept as" has no Transfer group.
  await page.getByRole("checkbox", { name: `Select ${cafe}` }).check();
  await page.getByRole("combobox", { name: "Category for the selected rows" }).click();
  await expect(page.getByRole("group", { name: "Transfer" })).toHaveCount(0);
});

test("with nothing noted in Wallet, Accept records Wallet's side at once", async ({ page }) => {
  const wallet = await start(page);
  await page.goto(toReview);

  await pickTransfer(page, cafe, "Transfer to Wallet");
  await page.getByRole("button", { name: `Accept ${cafe}` }).click();

  await expect(toastOf(page).getByText("1 Accepted")).toBeVisible();
  await expect(rowOf(page, cafe)).toHaveCount(0);
  await expect(dialogOf(page)).toHaveCount(0);

  const rows = await walletRows(page, wallet);
  const leg = rows.filter({ hasText: "Café de Jaren" });
  await expect(leg).toContainText("Transfer from Main");
  await expect(leg).toContainText("€18.00");
  await expect(leg).not.toContainText("In transit");
  await expect(page.getByText("€58.00").first()).toBeVisible();
});

test("a leg noted in Wallet is offered, closest first, and picking it Matches it", async ({
  page,
}) => {
  const wallet = await start(page);
  await noteFromMain(page, wallet, "2026-11-21", "ATM later");
  await noteFromMain(page, wallet, "2026-11-18", "ATM Leidseplein");
  await page.goto(toReview);

  await pickTransfer(page, cafe, "Transfer to Wallet");
  await page.getByRole("button", { name: `Accept ${cafe}` }).click();

  const dialog = dialogOf(page);
  await expect(dialog).toBeVisible();
  const choices = dialog.getByRole("radiogroup", { name: "Did you already note this in Wallet?" });
  await expect(choices.getByRole("radio")).toHaveCount(3);
  await expect(dialog.getByRole("radio", { name: /ATM Leidseplein/ })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /ATM Leidseplein/ })).toHaveAccessibleName(
    /ATM Leidseplein\s*Nov 18, 2026 · €18\.00/,
  );
  await expect(dialog.getByRole("radio", { name: "No, record it in Wallet now" })).toBeVisible();
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Accept" }).click();

  await expect(dialog).toBeHidden();
  await expect(toastOf(page).getByText("1 Accepted")).toBeVisible();
  await expect(rowOf(page, cafe)).toHaveCount(0);

  const rows = await walletRows(page, wallet);
  // The leg picked is Matched; nothing new was recorded, and the other stays In transit.
  await expect(rows.filter({ hasText: "Café de Jaren" })).toHaveCount(0);
  await expect(rows.filter({ hasText: "ATM Leidseplein" })).not.toContainText("In transit");
  await expect(rows.filter({ hasText: "ATM later" })).toContainText("In transit");
});

test("No, record it now records Wallet's side despite a suggestion", async ({ page }) => {
  const wallet = await start(page);
  await noteFromMain(page, wallet, "2026-11-19", "ATM Leidseplein");
  await page.goto(toReview);

  await pickTransfer(page, cafe, "Transfer to Wallet");
  await page.getByRole("button", { name: `Accept ${cafe}` }).click();
  const dialog = dialogOf(page);
  await dialog.getByRole("radio", { name: "No, record it in Wallet now" }).click();
  await dialog.getByRole("button", { name: "Accept" }).click();

  await expect(dialog).toBeHidden();
  await expect(toastOf(page).getByText("1 Accepted")).toBeVisible();

  const rows = await walletRows(page, wallet);
  await expect(rows.filter({ hasText: "Café de Jaren" })).not.toContainText("In transit");
  await expect(rows.filter({ hasText: "ATM Leidseplein" })).toContainText("In transit");
});

test("a leg taken meanwhile is the dialog's alert, and the suggestions are read again", async ({
  page,
}) => {
  const wallet = await start(page);
  const leg = await noteFromMain(page, wallet, "2026-11-19", "ATM Leidseplein");
  await page.goto(toReview);

  await pickTransfer(page, cafe, "Transfer to Wallet");
  await page.getByRole("button", { name: `Accept ${cafe}` }).click();
  const dialog = dialogOf(page);
  await expect(dialog.getByRole("radio", { name: /ATM Leidseplein/ })).toBeChecked();

  // Meanwhile the leg stops being one to Match: it's reversed.
  await apiCall(page, "POST", `${home}/transactions/${leg}/reverse`);
  await dialog.getByRole("button", { name: "Accept" }).click();

  await expect(dialog.getByRole("alert")).toContainText("Invalid Transfer");
  await expect(dialog.getByRole("alert")).toContainText(
    "match_transaction_id isn't an In transit leg",
  );
  await expect(dialog.getByRole("radio", { name: /ATM Leidseplein/ })).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: "No, record it in Wallet now" })).toBeChecked();
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Accept" }).click();
  await expect(dialog).toBeHidden();
  await expect(toastOf(page).getByText("1 Accepted")).toBeVisible();
});
