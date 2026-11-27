import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";
import { forceCategory } from "./force-category";

// Main in the default mock scenario (src/mocks/db.ts) has, To review: one
// Suspected duplicate (Shell Station 42, resembling the Accepted Shell row of
// Nov 14), and six Pending rows: Ikea (Nov 2), Jumbo, Bol.com, Café de Jaren,
// NS Reizigers and Tikkie from Sam (Nov 17–20). November is Main's open month.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;
const toReview = `${main}/to-review`;
const cafeId = "0190f5f2-7c00-7000-8000-000000000507";

const jumbo = "Nov 17, 2026, Jumbo, -€12.35";
const ikea = "Nov 2, 2026, Ikea, -€89.00";
const shell = "Nov 14, 2026, Shell Station 42, -€38.50";
const cafe = "Nov 19, 2026, Café de Jaren, -€18.00";
const tikkie = "Nov 20, 2026, Tikkie from Sam, €15.00";

const section = (page: Page, name: string) => page.getByRole("region", { name });
const rowOf = (page: Page, label: string) =>
  page.getByRole("row").filter({ has: page.getByRole("checkbox", { name: `Select ${label}` }) });

test("a Pending row is Accepted with the Category picked in its row", async ({ page }) => {
  await page.goto(toReview);

  await expect(section(page, "Suspected duplicates").getByRole("row")).toHaveCount(2);
  await expect(section(page, "Pending").getByRole("row")).toHaveCount(7);
  await expect(page.getByText("6 Pending rows")).toBeVisible();
  // Rows keep the API's order, oldest first.
  await expect(section(page, "Pending").getByRole("row").nth(1)).toContainText("Ikea");
  await expect(rowOf(page, jumbo)).toContainText("Transaction date: Nov 16, 2026");
  await expect(rowOf(page, "Nov 18, 2026, Bol.com order 4471, -€4.20")).toContainText(
    "Bol.comBol.com order 4471",
  );
  await expectAccessible(page);

  const picker = page.getByRole("combobox", { name: `Category for ${jumbo}` });
  await expect(picker).toHaveValue("Uncategorised");
  await picker.fill("Groceries");
  await page.getByRole("option", { name: "Food › Groceries" }).click();
  await page.getByRole("button", { name: `Accept ${jumbo}` }).click();

  await expect(rowOf(page, jumbo)).toHaveCount(0);
  const toast = page.getByRole("region", { name: /Notifications/ });
  await expect(toast.getByText("1 Accepted")).toBeVisible();
  await expect(page.getByText("5 Pending rows")).toBeVisible();

  await toast.getByRole("button", { name: "View in Transactions" }).click();
  await expect(page).toHaveURL(`${main}/transactions`);
  await page.goto(`${main}/transactions?booking_month=2026-11`);
  await expect(page.getByRole("combobox", { name: `Category for ${jumbo}` })).toHaveValue(
    "Food › Groceries",
  );
});

test("a row's picker offers only the Categories that fit its sign", async ({ page }) => {
  await page.goto(toReview);

  // Money in: Income, never Expense.
  await page.getByRole("combobox", { name: `Category for ${tikkie}` }).click();
  await expect(page.getByRole("option", { name: "Salary" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Uncategorised" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Transport" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Expense" })).toHaveCount(0);
  await expectAccessible(page, comboboxListOpen);
  await page.keyboard.press("Escape");

  // Money out: Expense, never Income.
  await page.getByRole("combobox", { name: `Category for ${jumbo}` }).click();
  await expect(page.getByRole("option", { name: "Transport" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Salary" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("a bulk Category fits the selection's sign, and a mixed one only Uncategorised", async ({
  page,
}) => {
  await page.goto(toReview);
  const bulk = page.getByRole("combobox", { name: "Category for the selected rows" });
  const hint = "Select only money out, or only money in, to pick a Category";

  // All money out.
  await page.getByRole("checkbox", { name: `Select ${jumbo}` }).click();
  await page.getByRole("checkbox", { name: `Select ${cafe}` }).click();
  await bulk.click();
  await expect(page.getByRole("option", { name: "Transport" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Salary" })).toHaveCount(0);
  await page.getByRole("option", { name: "Transport" }).click();
  await expect(bulk).toHaveValue("Transport");
  await expect(page.getByText(hint)).toHaveCount(0);

  // Money in too: the chosen Category no longer fits.
  await page.getByRole("checkbox", { name: `Select ${tikkie}` }).click();
  await expect(bulk).toHaveValue("Uncategorised");
  await expect(bulk).toHaveAccessibleDescription(hint);
  await expectAccessible(page);
  await bulk.click();
  await expect(page.getByRole("option")).toHaveText(["Uncategorised"]);
  await expectAccessible(page, comboboxListOpen);
  await page.keyboard.press("Escape");

  // Back to money out: the reset Category stays reset.
  await page.getByRole("checkbox", { name: `Select ${tikkie}` }).click();
  await expect(page.getByText(hint)).toHaveCount(0);
  await expect(bulk).toHaveValue("Uncategorised");
  await bulk.fill("Groceries");
  await page.getByRole("option", { name: "Food › Groceries" }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();

  const toast = page.getByRole("region", { name: /Notifications/ });
  await expect(toast.getByText("2 Accepted")).toBeVisible();
  await expect(rowOf(page, jumbo)).toHaveCount(0);
  await expect(rowOf(page, tikkie)).toHaveCount(1);
});

test("a Category the server refuses for the row's sign is a toast, and the row stays", async ({
  page,
}) => {
  await page.goto(toReview);
  await expect(page.getByText("6 Pending rows")).toBeVisible();
  const picker = page.getByRole("combobox", { name: `Category for ${cafe}` });
  await picker.fill("Groceries");
  await page.getByRole("option", { name: "Food › Groceries" }).click();

  // An Income Category on money out, past the picker.
  await forceCategory(page, home, "Salary");
  await page.getByRole("button", { name: `Accept ${cafe}` }).click();

  const toast = page.getByRole("region", { name: /Notifications/ });
  await expect(toast).toContainText(cafe);
  await expect(toast).toContainText(
    "Category doesn't fit the amount: An Income Category takes only money in",
  );
  await expect(rowOf(page, cafe)).toHaveCount(1);
  await expect(page.getByText("6 Pending rows")).toBeVisible();
  await expectAccessible(page);
});

test("a kept Suspected duplicate moves to Pending, still showing what it resembles", async ({
  page,
}) => {
  await page.goto(toReview);
  await expect(rowOf(page, shell)).toContainText(
    "Resembles: Nov 14, 2026 · Shell (differs) · -€38.50 · Accepted",
  );

  await page.getByRole("button", { name: `Keep ${shell}` }).click();

  await expect(section(page, "Suspected duplicates")).toHaveCount(0);
  const kept = section(page, "Pending").getByRole("row").filter({ hasText: "Shell Station 42" });
  await expect(kept).toContainText("Resembles: Nov 14, 2026 · Shell (differs)");
  await expect(kept.getByRole("button", { name: `Accept ${shell}` })).toBeVisible();
  await expect(page.getByText("7 Pending rows")).toBeVisible();
});

test("a Discard is confirmed first", async ({ page }) => {
  await page.goto(toReview);

  await page.getByRole("button", { name: `Discard ${ikea}` }).click();
  const dialog = page.getByRole("dialog", { name: "Discard this row?" });
  await expect(dialog).toHaveAccessibleDescription(
    "Discarded rows never reach your books, and this can't be undone.",
  );
  await expect(dialog.getByRole("listitem")).toHaveText([ikea]);
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(rowOf(page, ikea)).toHaveCount(1);

  await page.getByRole("button", { name: `Discard ${ikea}` }).click();
  await dialog.getByRole("button", { name: "Discard" }).click();
  await expect(rowOf(page, ikea)).toHaveCount(0);
  await page.reload();
  await expect(rowOf(page, jumbo)).toHaveCount(1);
  await expect(rowOf(page, ikea)).toHaveCount(0);
});

test("a bulk Accept reports what failed and keeps those rows selected", async ({ page }) => {
  // Café de Jaren's Accept fails, retries included.
  await page.goto(`${toReview}?mock-fail=${cafeId}/accept:3`);
  const pending = section(page, "Pending");

  await pending.getByRole("checkbox", { name: "Select all Pending rows" }).click();
  await expect(page.getByRole("status").filter({ hasText: "selected" })).toHaveText("6 selected");
  // Keep applies only to Suspected duplicates.
  await expect(page.getByRole("button", { name: "Keep", exact: true })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Category for the selected rows" })).toHaveValue(
    "Uncategorised",
  );
  await expectAccessible(page);

  // Selecting the Suspected duplicate too leaves only Discard.
  await page.getByRole("checkbox", { name: `Select ${shell}` }).click();
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: `Select ${shell}` }).click();

  await page.getByRole("button", { name: "Accept", exact: true }).click();
  const toast = page.getByRole("region", { name: /Notifications/ });
  await expect(toast.getByText("5 Accepted, 1 failed")).toBeVisible({ timeout: 15_000 });
  await expect(toast.getByText(`${cafe}: Service Unavailable`)).toBeVisible();
  await expect(pending.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("checkbox", { name: `Select ${cafe}` })).toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "selected" })).toHaveText("1 selected");
});

test("the month field offers only months with rows To review", async ({ page }) => {
  // Savings: Interest pending in October, a deposit in November, not open yet.
  const savings = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000103/to-review`;
  await page.goto(savings);

  const field = page.getByRole("combobox", { name: /^Month/ });
  await expect(field).toContainText("All months");
  await field.click();
  await expect(page.getByRole("option")).toHaveText([
    "All months",
    "November 2026",
    "October 2026",
  ]);
  await page.getByRole("option", { name: "November 2026" }).click();
  await expect(page).toHaveURL(`${savings}?booking_month=2026-11`);
  await expect(page.getByText("November 2026 isn't open yet")).toBeVisible();
  await expectAccessible(page);

  // The arrows skip September and August, which have nothing To review.
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page).toHaveURL(`${savings}?booking_month=2026-10`);
  await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();

  // A month carried over from Transactions still shows.
  await page.goto(`${savings}?booking_month=2026-08`);
  await expect(field).toContainText("August 2026");
  await expect(page.getByText("Nothing to review in August 2026")).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page).toHaveURL(`${savings}?booking_month=2026-10`);
});

test("the state filter shows Suspected duplicates only, and the empty states", async ({ page }) => {
  await page.goto(`${toReview}?state=SUSPECTED_DUPLICATE`);

  await expect(page.getByText("Showing Suspected duplicates only.")).toBeVisible();
  await expect(section(page, "Pending")).toHaveCount(0);
  await expect(section(page, "Suspected duplicates").getByRole("row")).toHaveCount(2);
  await expectAccessible(page);

  // The last one Discarded: nothing left under the filter.
  await page.getByRole("button", { name: `Discard ${shell}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
  await expect(page.getByText("No Suspected duplicates to review")).toBeVisible();
  await page.getByRole("button", { name: "Show everything" }).click();
  await expect(page).toHaveURL(`${toReview}?booking_month=all`);
  await expect(section(page, "Pending").getByRole("row")).toHaveCount(7);

  // A month with nothing to review.
  await page.goto(`${toReview}?booking_month=2026-09`);
  await expect(page.getByText("Nothing to review in September 2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to September 2026" })).toHaveAttribute(
    "href",
    `${main}/months/2026-09`,
  );
  await expectAccessible(page);
  await page.getByRole("button", { name: "Show all months" }).click();
  await expect(page).toHaveURL(`${toReview}?booking_month=all`);

  // One month only.
  await page.goto(`${toReview}?booking_month=2026-10`);
  await expect(page.getByText("Nothing to review in October 2026")).toBeVisible();
  await page.goto(`${toReview}?booking_month=2026-11`);
  await expect(section(page, "Pending").getByRole("row")).toHaveCount(7);
  // Discarded above.
  await expect(section(page, "Suspected duplicates")).toHaveCount(0);
});
