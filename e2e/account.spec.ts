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
  // The Opening count is only for Cash.
  await expect(dialog.getByRole("textbox", { name: /Opening count/ })).toHaveCount(0);
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

  await expect(page.getByText("Connection created: Card statements.")).toBeVisible();
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

  await tabs.getByRole("link", { name: "Statement imports" }).click();
  await expect(page.getByRole("region", { name: "Statement imports" })).toBeVisible();
  await tabs.getByRole("link", { name: "Connections" }).click();
  await expect(page.getByRole("region", { name: "Connections" })).toBeVisible();
  // The header's "Import statement" is on every tab.
  await page.getByRole("link", { name: "Import statement", exact: true }).click();
  await expect(page).toHaveURL(`${main}/statement-imports/new`);
});

/** Adds a cash Account named Wallet to Home, counted at €40.00 today. */
async function addWallet(page: Page) {
  await page.goto(home);
  const dialog = await openAddAccount(page);
  await dialog.getByRole("textbox", { name: "Name" }).fill("Wallet");
  await dialog.getByRole("radio", { name: "Cash" }).check();
  await dialog.getByRole("textbox", { name: "Opening count (EUR)" }).fill("40");
  await dialog.getByRole("textbox", { name: "Opening count again (EUR)" }).fill("40.00");
  await dialog.getByRole("button", { name: "Add Account" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  return page.url().replace(/\/transactions$/, "");
}

test("adding a cash Account asks for the Opening count twice and lands on Transactions", async ({
  page,
}) => {
  await page.goto(home);
  const dialog = await openAddAccount(page);
  const start = dialog.getByRole("textbox", { name: "Start date" });
  const count = dialog.getByRole("textbox", { name: "Opening count (EUR)" });
  const again = dialog.getByRole("textbox", { name: "Opening count again (EUR)" });

  // Cash reveals the two counts and starts today.
  await dialog.getByRole("radio", { name: "Cash" }).check();
  await expect(count).toBeVisible();
  await expect(count).toHaveAccessibleDescription("The cash in it on the start date.");
  await expect(again).toBeVisible();
  await expect(start).toHaveValue(usDate(now));
  await expect(start).toHaveAccessibleDescription(/The day you count the cash/);
  await expectAccessible(page);

  // Required, then different.
  await dialog.getByRole("textbox", { name: "Name" }).fill("Wallet");
  await dialog.getByRole("button", { name: "Add Account" }).click();
  await expect(count).toHaveAccessibleDescription(/Type the Opening count/);
  await expect(again).toHaveAccessibleDescription("Type the Opening count again");
  await count.fill("40");
  await again.fill("45");
  await dialog.getByRole("button", { name: "Add Account" }).click();
  await expect(again).toHaveAccessibleDescription("The two counts differ. Count again.");
  await expect(again).toHaveAttribute("aria-invalid", "true");
  await expectAccessible(page);

  // They agree.
  await again.fill("40.00");
  await dialog.getByRole("button", { name: "Add Account" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`^.*${home}/accounts/[0-9a-f-]{36}/transactions$`));
  await expect(page.getByRole("heading", { level: 1, name: "Wallet" })).toBeVisible();
  await expect(page.getByText("Cash · EUR · €40.00")).toBeVisible();
  await expect(page.getByRole("row", { name: /Opening balance/ })).toBeVisible();
  // Only Transactions and Months, and nothing to import.
  const tabs = page.getByRole("navigation", { name: "Account" });
  await expect(tabs.getByRole("link")).toHaveText(["Transactions", "Months"]);
  await expect(page.getByRole("link", { name: "Import statement" })).toHaveCount(0);
  await expectAccessible(page);
});

test("the start date follows the kind until the member picks one", async ({ page }) => {
  await page.goto(home);
  const dialog = await openAddAccount(page);
  const start = dialog.getByRole("textbox", { name: "Start date" });

  await dialog.getByRole("radio", { name: "Cash" }).check();
  await expect(start).toHaveValue(usDate(now));
  await dialog.getByRole("radio", { name: "Loan" }).check();
  await expect(start).toHaveValue(usDate(firstOfMonth));

  // Once edited, switching the kind keeps it.
  const lastOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  await start.fill(usDate(lastOfPreviousMonth));
  await dialog.getByRole("radio", { name: "Cash" }).check();
  await expect(start).toHaveValue(usDate(lastOfPreviousMonth));
});

test("a cash Account's statement-only routes go to Transactions", async ({ page }) => {
  const wallet = await addWallet(page);

  for (const path of [
    "",
    "/to-review",
    "/statement-imports",
    "/statement-imports/new",
    "/connections",
    "/connections/new",
  ]) {
    await page.goto(`${wallet}${path}`);
    await expect(page).toHaveURL(`${wallet}/transactions`);
  }
  await expect(page.getByRole("heading", { level: 1, name: "Wallet" })).toBeVisible();
});

test("the overview shows no To review count for a cash Account", async ({ page }) => {
  await addWallet(page);
  await page.goto(home);

  const row = page.getByRole("row", { name: /Wallet/ });
  await expect(row.getByRole("cell").nth(2)).toHaveText(
    "—Nothing to review: a cash Account has no statements",
  );
  await expect(row.getByRole("link", { name: /To review/ })).toHaveCount(0);
  await expect(row.getByRole("cell").nth(4)).toHaveText("€40.00");
  await expectAccessible(page);
});

async function openCorrectOpeningCount(page: Page) {
  await page.getByRole("button", { name: "More Account actions" }).click();
  await page.getByRole("menuitem", { name: "Correct opening count…" }).click();
  return page.getByRole("dialog", { name: "Correct opening count" });
}

test("correcting the Opening count in the start month changes the balance", async ({ page }) => {
  await addWallet(page);
  const dialog = await openCorrectOpeningCount(page);
  const count = dialog.getByRole("textbox", { name: "Opening count (EUR)" });
  const again = dialog.getByRole("textbox", { name: "Opening count again (EUR)" });
  await expect(count).toHaveAccessibleDescription(/^The cash in it on /);
  await expectAccessible(page);

  // Required, then different: the same check as Add Account.
  await dialog.getByRole("button", { name: "Correct opening count" }).click();
  await expect(count).toHaveAccessibleDescription(/Type the Opening count/);
  await expect(again).toHaveAccessibleDescription("Type the Opening count again");
  await count.fill("45");
  await again.fill("54");
  await dialog.getByRole("button", { name: "Correct opening count" }).click();
  await expect(again).toHaveAccessibleDescription("The two counts differ. Count again.");
  await expectAccessible(page);

  await again.fill("45.00");
  await dialog.getByRole("button", { name: "Correct opening count" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Cash · EUR · €45.00")).toBeVisible();
  await expect(page.getByRole("row", { name: /Opening balance.*€45\.00/ })).toBeVisible();
});

test("a statement Account has no Correct opening count…", async ({ page }) => {
  await page.goto(`${main}/transactions`);
  await page.getByRole("button", { name: "More Account actions" }).click();

  await expect(page.getByRole("menuitem")).toHaveText(["Rename…"]);
});

test("once the start month closes, the Opening count is locked and the item is gone", async ({
  page,
}) => {
  // October 2026 has ended.
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
  await page.goto(home);
  // The mock API serves the page once it shows.
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  // Wallet, counted at €40.00 on 15 October.
  const walletId = await page.evaluate(async (path) => {
    const response = await fetch(`/api${path}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"name":"Wallet","kind":"CASH","currency":"EUR","start_date":"2026-10-15","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}',
    });
    return ((await response.json()) as { account_id: string }).account_id;
  }, home);
  const wallet = `${home}/accounts/${walletId}`;
  await page.goto(`${wallet}/transactions`);
  const dialog = await openCorrectOpeningCount(page);

  // Another member closes October meanwhile.
  await page.evaluate(async (path) => {
    await fetch(`/api${path}/months/2026-10/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"statement_balance":{"amount":40.00,"currency":"EUR"},"counted_on":"2026-11-01"}',
    });
  }, wallet);
  await dialog.getByRole("textbox", { name: "Opening count (EUR)" }).fill("45");
  await dialog.getByRole("textbox", { name: "Opening count again (EUR)" }).fill("45");
  await dialog.getByRole("button", { name: "Correct opening count" }).click();

  await expect(dialog.getByRole("alert")).toContainText("Opening count locked");
  await expect(dialog.getByRole("alert")).toContainText("Reopen back to it first.");
  await expectAccessible(page);

  await page.reload();
  await page.getByRole("button", { name: "More Account actions" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["Rename…"]);
  await expect(page.getByText("Cash · EUR · €40.00")).toBeVisible();
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
    // The dialog scrolls to its button.
    const submit = dialog.getByRole("button", { name: "Add Account" });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
    await expectAccessible(page);
  });
});
