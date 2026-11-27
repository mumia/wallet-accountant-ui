import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// Main in the default mock scenario (src/mocks/db.ts) has Café de Jaren
// (−€18.00, Nov 19) Pending in its open month, November 2026. Each test adds
// its own cash Accounts, counted at €40.00, and makes its Transfer through the
// API; then reverses a leg in the UI.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const mainId = "0190f5f2-7c00-7000-8000-000000000101";
const main = `${home}/accounts/${mainId}`;
const cafeRow = "0190f5f2-7c00-7000-8000-000000000507";

const body =
  "A reversal with the opposite amount is recorded on the same date; both stay in the list.";

const rowOf = (page: Page, text: string) =>
  page
    .locator("tbody tr")
    .filter({ hasText: text })
    .filter({ hasNot: page.getByText(/^Reversal of/) });
const toast = (page: Page, text: string) => page.getByRole("dialog").filter({ hasText: text });

/** Calls the mock API as the page would, returning the JSON answer. */
async function apiCall(page: Page, method: string, path: string, json?: string) {
  return page.evaluate(
    async ({ method, path, json }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(json === undefined ? {} : { body: json }),
      });
      return (await response.json()) as { account_id?: string; transaction_id?: string };
    },
    { method, path, json },
  );
}

/** Opens Home, so the mock API serves the page, and adds the cash Accounts. */
async function start(page: Page, names: string[], startDate = "2026-11-01") {
  await page.goto(home);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  const ids: string[] = [];
  for (const name of names) {
    const account = await apiCall(
      page,
      "POST",
      `${home}/accounts`,
      `{"name":"${name}","kind":"CASH","currency":"EUR","start_date":"${startDate}","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
    );
    ids.push(account.account_id ?? "");
  }
  return ids;
}

/** Notes a leg in the cash Account by hand; returns its ID. */
async function noteLeg(
  page: Page,
  cash: string,
  counterpart: string,
  date: string,
  amount: string,
) {
  const leg = await apiCall(
    page,
    "POST",
    `${home}/accounts/${cash}/transactions`,
    `{"date":"${date}","amount":{"amount":${amount},"currency":"EUR"},"description":"ATM","counterpart_account_id":"${counterpart}"}`,
  );
  return leg.transaction_id ?? "";
}

/** Accepts Café de Jaren as a Transfer to the cash Account, Matching `leg` if given. */
async function acceptCafe(page: Page, cash: string, leg?: string) {
  await apiCall(
    page,
    "POST",
    `${home}/imported-transactions/${cafeRow}/accept`,
    leg === undefined
      ? `{"transfer_account_id":"${cash}"}`
      : `{"transfer_account_id":"${cash}","match_transaction_id":"${leg}"}`,
  );
}

async function openTransactions(page: Page, path: string, name: string, month = "2026-11") {
  await page.goto(`${path}/transactions?booking_month=${month}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** Opens the reverse dialog of the row with `text`, a leg described `description`. */
async function openReverse(page: Page, text: string, description = text) {
  await rowOf(page, text)
    .getByRole("button", { name: /^Actions for/ })
    .click();
  await page.getByRole("menuitem", { name: "Reverse…" }).click();
  const dialog = page.getByRole("dialog", { name: new RegExp(`^Reverse "${description}"`) });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

test("a bank leg: its row goes back To review, and the cash leg the Accept recorded is reversed too", async ({
  page,
}) => {
  const [wallet = ""] = await start(page, ["Wallet"]);
  await acceptCafe(page, wallet);
  await openTransactions(page, `${home}/accounts/${wallet}`, "Wallet");
  await expect(page.getByText("Cash · EUR · €58.00")).toBeVisible();
  await openTransactions(page, main, "Main");
  const bankLeg = rowOf(page, "Transfer to Wallet");

  const dialog = await openReverse(page, "Transfer to Wallet", "Café de Jaren");
  await expect(dialog).toHaveAccessibleDescription(
    `${body} Its row goes back to To review. If Wallet's side was recorded by this Accept, ` +
      "it's reversed too. If you noted it by hand, it stays, In transit.",
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Reverse" }).click();

  await expect(toast(page, "Reversed.")).toBeVisible();
  await expect(bankLeg.getByRole("link", { name: "Reversed" })).toBeVisible();
  await page.goto(`${main}/to-review?booking_month=2026-11`);
  await expect(
    page.getByRole("button", { name: "Accept Nov 19, 2026, Café de Jaren, -€18.00" }),
  ).toBeVisible();

  await openTransactions(page, `${home}/accounts/${wallet}`, "Wallet");
  await expect(rowOf(page, "Café de Jaren").getByRole("link", { name: "Reversed" })).toBeVisible();
  await expect(page.getByText("Cash · EUR · €40.00")).toBeVisible();
  await expectAccessible(page);
});

test("a cash leg noted by hand: only it is reversed, and Main's side stays, In transit", async ({
  page,
}) => {
  const [wallet = ""] = await start(page, ["Wallet"]);
  const leg = await noteLeg(page, wallet, mainId, "2026-11-19", "18");
  await acceptCafe(page, wallet, leg);
  // Main's list is read before the reversal, so it must refetch after it.
  await openTransactions(page, main, "Main");
  await expect(
    rowOf(page, "Transfer to Wallet").getByText("In transit", { exact: true }),
  ).toHaveCount(0);
  await openTransactions(page, `${home}/accounts/${wallet}`, "Wallet");

  const dialog = await openReverse(page, "ATM");
  await expect(dialog).toHaveAccessibleDescription(
    `${body} Only this side is reversed. Main's side stays Accepted, In transit.`,
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Reverse" }).click();
  await expect(toast(page, "Reversed.")).toBeVisible();
  await expect(rowOf(page, "ATM").getByRole("link", { name: "Reversed" })).toBeVisible();

  await rowOf(page, "ATM").getByRole("link", { name: "Main" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Main" })).toBeVisible();
  const bankLeg = rowOf(page, "Transfer to Wallet");
  await expect(bankLeg.getByText("In transit", { exact: true })).toBeVisible();
  await expect(bankLeg.getByRole("link", { name: "Reversed" })).toHaveCount(0);
});

test("a cash leg the Accept recorded warns the same", async ({ page }) => {
  const [wallet = ""] = await start(page, ["Wallet"]);
  await acceptCafe(page, wallet);
  await openTransactions(page, `${home}/accounts/${wallet}`, "Wallet");

  const dialog = await openReverse(page, "Café de Jaren");
  await expect(dialog).toHaveAccessibleDescription(
    `${body} Only this side is reversed. Main's side stays Accepted, In transit.`,
  );
});

test("cash ↔ cash: both sides are reversed", async ({ page }) => {
  const [wallet = "", purse = ""] = await start(page, ["Wallet", "Purse"]);
  await noteLeg(page, wallet, purse, "2026-11-19", "-15");
  const walletPath = `${home}/accounts/${wallet}`;
  // Wallet's list is read before the reversal, so it must refetch after it.
  await openTransactions(page, walletPath, "Wallet");
  await expect(page.getByText("Cash · EUR · €25.00")).toBeVisible();
  await openTransactions(page, `${home}/accounts/${purse}`, "Purse");

  const dialog = await openReverse(page, "ATM");
  await expect(dialog).toHaveAccessibleDescription(
    `${body} Both sides are reversed: this one and Wallet's.`,
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Reverse" }).click();
  await expect(toast(page, "Reversed.")).toBeVisible();
  await expect(rowOf(page, "ATM").getByRole("link", { name: "Reversed" })).toBeVisible();
  await expect(page.getByText("Cash · EUR · €40.00")).toBeVisible();

  await rowOf(page, "ATM").getByRole("link", { name: "Wallet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wallet" })).toBeVisible();
  await expect(rowOf(page, "ATM").getByRole("link", { name: "Reversed" })).toBeVisible();
  await expect(page.getByText("Cash · EUR · €40.00")).toBeVisible();
});

test("a leg In transit gets no extra warning", async ({ page }) => {
  const [wallet = ""] = await start(page, ["Wallet"]);
  await noteLeg(page, wallet, mainId, "2026-11-19", "18");
  await openTransactions(page, `${home}/accounts/${wallet}`, "Wallet");

  const dialog = await openReverse(page, "ATM");
  await expect(dialog).toHaveAccessibleDescription(body);
});

test("a refusal names the other Account's closed month", async ({ page }) => {
  const [wallet = "", purse = ""] = await start(page, ["Wallet", "Purse"], "2026-10-01");
  await noteLeg(page, wallet, purse, "2026-10-15", "-5");
  await apiCall(
    page,
    "POST",
    `${home}/accounts/${purse}/months/2026-10/close`,
    `{"statement_balance":{"amount":45.00,"currency":"EUR"},"counted_on":"2026-11-01"}`,
  );
  await openTransactions(page, `${home}/accounts/${wallet}`, "Wallet", "2026-10");

  const dialog = await openReverse(page, "ATM");
  await dialog.getByRole("button", { name: "Reverse" }).click();

  const refused = toast(page, "wasn't reversed");
  await expect(refused).toContainText("Oct 15, 2026, ATM, -€5.00 wasn't reversed");
  await expect(refused).toContainText("Purse's October 2026 is closed. Reopen it to reverse this.");
  await expect(rowOf(page, "ATM").getByRole("link", { name: "Reversed" })).toHaveCount(0);
  await expectAccessible(page);
});
