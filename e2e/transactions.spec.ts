import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";
import { forceCategory } from "./force-category";

// Main in the default mock scenario (src/mocks/db.ts): its Opening balance, then
// rent, 22 card payments and salary each month from January to November 2026,
// a reversed pair in October, and two Accepted rows on Nov 14: 269
// Transactions. November is open (its Bol.com and Tikkie rows Uncategorised);
// January to October are closed. Savings is open in October, where its
// deposit was Accepted from an Imported transaction.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101/transactions`;
const creditCard = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000102/transactions`;
const savingsAccount = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000103`;

const bodyRows = (page: Page) => page.locator("tbody tr:not([aria-hidden])");
const row = (page: Page, text: string | RegExp) => bodyRows(page).filter({ hasText: text });
const picker = (page: Page, row: RegExp) => page.getByRole("combobox", { name: row });
const bolNov7 = /^Category for Nov 7, 2026, Bol\.com, -€9\.28$/;
const toast = (page: Page, text: string) => page.getByRole("dialog").filter({ hasText: text });

async function chooseMonth(page: Page, month: string) {
  await page.getByRole("combobox", { name: /^Month/ }).click();
  await page.getByRole("option", { name: month }).click();
}

async function pick(page: Page, row: RegExp, category: string) {
  await picker(page, row).fill(category);
  await page.getByRole("option", { name: category, exact: true }).click();
}

test("the tab opens on the open month, offering every month", async ({ page }) => {
  await page.goto(main);

  await expect(page.getByRole("combobox", { name: /^Month/ })).toContainText("November 2026");
  await expect(bodyRows(page)).toHaveCount(26);
  await expect(page.getByRole("button", { name: "Next month" })).toBeDisabled();
  await expectAccessible(page);
  await page.getByRole("combobox", { name: /^Month/ }).click();
  // January to November 2026, and All months.
  await expect(page.getByRole("option")).toHaveCount(12);
  await expect(page.getByRole("option").nth(1)).toHaveText("November 2026");
  await expect(page.getByRole("option").last()).toHaveText("January 2026");
});

test("all months load page by page; a chosen month loads in full", async ({ page }) => {
  await page.goto(`${main}?booking_month=all`);

  await expect(page.getByRole("combobox", { name: /^Month/ })).toContainText("All months");
  await expect(page.getByRole("status")).toHaveText("Showing 200 Transactions so far");
  const chip = page.getByRole("button", { name: "Uncategorised only" });
  await expect(chip).toBeDisabled();
  await expect(chip).toHaveAccessibleDescription("Choose a month first");
  // Only the rows near the viewport are in the page.
  expect(await bodyRows(page).count()).toBeLessThan(60);
  // The Opening balance's Category is text, not a picker, and it can't be reversed.
  await expect(bodyRows(page).first()).toContainText("Opening balance");
  await expect(bodyRows(page).first().getByRole("combobox")).toHaveCount(0);
  await expect(
    bodyRows(page)
      .first()
      .getByRole("button", { name: /^Actions for/ }),
  ).toHaveCount(0);
  await expectAccessible(page);

  await page.keyboard.press("End");
  await expect(async () => {
    await page.mouse.wheel(0, 20_000);
    await expect(page.getByRole("status")).toHaveText("269 Transactions", { timeout: 1000 });
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
  await page.goto(`${main}?booking_month=2026-11`);

  await expect(picker(page, bolNov7)).toHaveValue("Uncategorised");
  await picker(page, bolNov7).fill("groc");
  await expect(page.getByRole("option", { name: "Food › Groceries" })).toBeVisible();
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "Food › Groceries" }).click();
  await expect(picker(page, bolNov7)).toHaveValue("Food › Groceries");

  await page.reload();
  await expect(picker(page, bolNov7)).toHaveValue("Food › Groceries");
});

test("a row's picker offers only the Categories that fit its sign", async ({ page }) => {
  await page.goto(`${main}?booking_month=2026-11`);
  const salary = /^Category for Nov 25, 2026, Salary, €3,200\.00$/;

  // Money in: Income, never Expense.
  await picker(page, salary).click();
  await expect(page.getByRole("option")).toHaveText(["Uncategorised", "Salary"]);
  await expectAccessible(page, comboboxListOpen);
  await page.keyboard.press("Escape");

  // Money out: Expense, never Income.
  await picker(page, bolNov7).click();
  await expect(page.getByRole("option", { name: "Transport" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Salary" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Income" })).toHaveCount(0);
  await expectAccessible(page, comboboxListOpen);
});

test("a failed save rolls back, with a toast naming the row", async ({ page }) => {
  // The save and its two retries fail.
  await page.goto(`${main}?booking_month=2026-11&mock-fail=PATCH:3`);

  await pick(page, bolNov7, "Transport");
  await expect(picker(page, bolNov7)).toHaveValue("Transport");

  const failed = toast(page, "wasn't changed");
  await expect(failed).toContainText(
    "The Category of Nov 7, 2026, Bol.com, -€9.28 wasn't changed",
    {
      timeout: 10_000,
    },
  );
  await expect(failed).toContainText("Service Unavailable");
  await expect(picker(page, bolNov7)).toHaveValue("Uncategorised");
  await expectAccessible(page);

  // Toasts are reached from the keyboard with F6.
  await page.keyboard.press("F6");
  await failed.getByRole("button", { name: "Close" }).click();
  await expect(failed).toBeHidden();
});

test("a Category the server refuses for the row's sign rolls back, with a toast", async ({
  page,
}) => {
  await page.goto(`${main}?booking_month=2026-11`);
  await expect(picker(page, bolNov7)).toHaveValue("Uncategorised");

  // An Income Category on money out, past the picker.
  await forceCategory(page, home, "Salary");
  await pick(page, bolNov7, "Transport");

  const failed = toast(page, "wasn't changed");
  await expect(failed).toContainText("The Category of Nov 7, 2026, Bol.com, -€9.28 wasn't changed");
  await expect(failed).toContainText("Category doesn't fit the amount");
  await expect(picker(page, bolNov7)).toHaveValue("Uncategorised");
  await expectAccessible(page);
});

test("the Uncategorised toggle narrows a month, and keeps rows given a Category", async ({
  page,
}) => {
  await page.goto(`${main}?booking_month=2026-11`);
  const chip = page.getByRole("button", { name: "Uncategorised only (6)" });
  await expect(chip).toHaveAttribute("aria-pressed", "false");

  await chip.click();
  await expect(page).toHaveURL(`${main}?booking_month=2026-11&uncategorised=true`);
  await expect(bodyRows(page)).toHaveCount(6);
  await expectAccessible(page);

  // A row given a Category stays until the filter changes.
  await pick(page, bolNov7, "Transport");
  await expect(page.getByRole("button", { name: "Uncategorised only (5)" })).toBeVisible();
  await expect(bodyRows(page)).toHaveCount(6);
  await page.getByRole("button", { name: "Uncategorised only (5)" }).click();
  await page.getByRole("button", { name: "Uncategorised only (5)" }).click();
  await expect(bodyRows(page)).toHaveCount(5);

  // Once every row has a Category.
  for (const name of [
    /Nov 8, 2026, Tikkie/,
    /Nov 14, 2026, Bol/,
    /Nov 15, 2026, Tikkie/,
    /Nov 21, 2026, Bol/,
    /Nov 22, 2026, Tikkie/,
  ]) {
    // Each save lands before the reload reads them back.
    const saved = page.waitForResponse((response) => response.request().method() === "PATCH");
    await pick(page, name, "Transport");
    await saved;
  }
  await page.reload();
  await expect(page.getByText("Everything in November 2026 has a Category ✓")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Show all Transactions" }).click();
  await expect(page).toHaveURL(`${main}?booking_month=2026-11`);
  await expect(bodyRows(page)).toHaveCount(26);
});

test("an empty month with rows To review offers To review", async ({ page }) => {
  // Savings' November isn't open yet: a deposit waits there, To review.
  await page.goto(`${savingsAccount}/transactions`);
  await expect(page.getByRole("combobox", { name: /^Month/ })).toContainText("October 2026");
  await page.getByRole("button", { name: "Next month" }).click();

  await expect(page.getByText("No Transactions in November 2026")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Go to To review" }).click();
  await expect(page).toHaveURL(`${savingsAccount}/to-review?booking_month=2026-11`);
  await expect(page.getByRole("region", { name: "Pending" })).toContainText("Transfer from Main");
});

test("an Account with no Transactions says so", async ({ page }) => {
  await page.goto(`${creditCard}?booking_month=2026-11`);

  await expect(page.getByText("No Transactions in November 2026")).toBeVisible();
  await expectAccessible(page);
  // No rows To review there, so no way to To review.
  await expect(page.getByRole("button", { name: "Go to To review" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show all months" }).click();

  await expect(page).toHaveURL(`${creditCard}?booking_month=all`);
  await expect(page.getByText("No Transactions yet.")).toBeVisible();
});

test("Reverse in the open month: the reversal is linked to its original", async ({ page }) => {
  await page.goto(`${main}?booking_month=2026-11`);
  await expect(bodyRows(page)).toHaveCount(26);

  await row(page, "Rent")
    .getByRole("button", { name: "Actions for Nov 1, 2026, Rent, -€1,150.00" })
    .click();
  await page.getByRole("menuitem", { name: "Reverse…" }).click();
  const dialog = page.getByRole("dialog", { name: 'Reverse "Rent", -€1,150.00 on Nov 1, 2026?' });
  await expect(dialog).toHaveAccessibleDescription(
    "A reversal with the opposite amount is recorded on the same date; both stay in the list.",
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Reverse" }).click();
  await expect(dialog).toBeHidden();

  const done = toast(page, "Reversed.");
  await expect(done).toBeVisible();
  await expect(done).not.toContainText("To review");
  await expect(bodyRows(page)).toHaveCount(27);
  const [original, reversal] = [bodyRows(page).nth(0), bodyRows(page).nth(1)];
  await expect(original).toContainText("Rent");
  await expect(original.getByRole("link", { name: "Reversed" })).toBeVisible();
  await expect(reversal).toContainText("Reversal of Nov 1, 2026, Rent, -€1,150.00");
  await expect(reversal).toContainText("€1,150.00");
  // Neither has a Category picker or a row menu any more.
  for (const pair of [original, reversal]) {
    await expect(pair.getByRole("combobox")).toHaveCount(0);
    await expect(pair.getByRole("button", { name: /^Actions for/ })).toHaveCount(0);
  }
  await expectAccessible(page);

  // Open highlights the reversal; its link highlights the original.
  await done.getByRole("button", { name: "Open" }).click();
  await expect(page).toHaveURL(/booking_month=2026-11&transaction_id=/);
  await expect(reversal).toHaveAttribute("aria-current", "true");
  await expect(reversal).toBeFocused();
  await reversal.getByRole("link", { name: /^Reversal of/ }).click();
  await expect(original).toHaveAttribute("aria-current", "true");
  await expect(original).toBeFocused();
  await expectAccessible(page);
  await original.getByRole("link", { name: "Reversed" }).click();
  await expect(reversal).toBeFocused();
});

test("Reverse of an Accepted row sends its Imported transaction back to To review", async ({
  page,
}) => {
  await page.goto(`${savingsAccount}/transactions?booking_month=2026-10`);

  await row(page, "Transfer from Main")
    .getByRole("button", { name: /^Actions for Oct 25, 2026, Transfer from Main/ })
    .click();
  await page.getByRole("menuitem", { name: "Reverse…" }).click();
  const dialog = page.getByRole("dialog", { name: /^Reverse "Transfer from Main"/ });
  await expect(dialog).toHaveAccessibleDescription(
    "A reversal with the opposite amount is recorded on the same date; both stay in the list. " +
      "Its Imported transaction goes back to To review, to be Accepted again or Discarded.",
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Reverse" }).click();

  await expect(toast(page, "Reversed.")).toContainText(
    "Its Imported transaction is back in To review.",
  );
  await expect(row(page, "Reversal of")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Account" })
    .getByRole("link", { name: "To review" })
    .click();
  await expect(page).toHaveURL(`${savingsAccount}/to-review?booking_month=2026-10`);
  await expect(
    page.getByRole("button", { name: /^Accept Oct 25, 2026, Transfer from Main/ }),
  ).toBeVisible();
});

test("a failed Reverse is a toast naming the row", async ({ page }) => {
  // The Reverse and its two retries fail.
  await page.goto(`${main}?booking_month=2026-11&mock-fail=POST:3`);

  await row(page, "Rent")
    .getByRole("button", { name: /^Actions for/ })
    .click();
  await page.getByRole("menuitem", { name: "Reverse…" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reverse" }).click();

  await expect(toast(page, "wasn't reversed")).toContainText(
    "Nov 1, 2026, Rent, -€1,150.00 wasn't reversed",
    { timeout: 10_000 },
  );
  await expect(bodyRows(page)).toHaveCount(26);
  await expectAccessible(page);
});

test("a closed month's rows are locked, but their Category still changes", async ({ page }) => {
  await page.goto(`${main}?booking_month=2026-03`);
  const albertHeijn = /^Category for Mar 5, 2026, Albert Heijn, -€5\.26$/;

  await expect(
    page.getByText(
      "March 2026 is closed: amounts and descriptions are locked. Categories can still change, but not to Uncategorised.",
    ),
  ).toBeVisible();
  await expect(bodyRows(page).first()).toContainText("March 2026 is closed");
  await expect(page.getByRole("button", { name: /^Actions for/ })).toHaveCount(0);
  await expectAccessible(page);

  // Uncategorised isn't offered.
  await picker(page, albertHeijn).click();
  await expect(page.getByRole("option", { name: "Food › Groceries" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Uncategorised" })).toHaveCount(0);
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "Transport" }).click();
  await expect(picker(page, albertHeijn)).toHaveValue("Transport");
  await page.reload();
  await expect(picker(page, albertHeijn)).toHaveValue("Transport");

  // October's reversed pair: muted, linked, and not counted as Uncategorised.
  await page.goto(`${main}?booking_month=2026-10`);
  await expect(page.getByRole("button", { name: "Uncategorised only (0)" })).toBeVisible();
  await expect(row(page, "Coolblue").first().getByRole("link", { name: "Reversed" })).toBeVisible();
  await expect(row(page, "Reversal of Oct 26, 2026, Coolblue, -€249.00")).toHaveCount(1);
  await expectAccessible(page);
});
