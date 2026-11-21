import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// "Home" in the default mock scenario (src/mocks/db.ts): Food › Eating out,
// Food › Groceries, Housing › Rent, Transport; Salary; and the Internal three.
const categories = "/households/0190f5f2-7c00-7000-8000-000000000001/categories";

const section = (page: Page, name: string) => page.getByRole("region", { name });
const row = (page: Page, name: string) =>
  page
    .getByRole("listitem")
    .filter({ has: page.getByText(name, { exact: true }) })
    .last();

async function rowAction(page: Page, name: string, action: string) {
  await page.getByRole("button", { name: `Actions for ${name}` }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

test("the tree shows Expense, Income and Internal, with Internal locked", async ({ page }) => {
  await page.goto(categories);

  await expect(page.getByRole("heading", { level: 1, name: "Categories" })).toBeVisible();
  await expect(section(page, "Expense")).toContainText("Groceries");
  await expect(section(page, "Income")).toContainText("Salary");
  const internal = section(page, "Internal");
  await expect(internal).toContainText("Created by Wallet Accountant. Can't be renamed or moved.");
  await expect(internal).toContainText("Uncategorised");
  await expect(internal.getByRole("button")).toHaveCount(0);
  await expectAccessible(page);

  // Parents can be collapsed, and start expanded.
  const toggle = page.getByRole("button", { name: "Hide the sub-Categories of Food" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(section(page, "Expense").getByText("Groceries")).toBeHidden();
  await page.getByRole("button", { name: "Show the sub-Categories of Food" }).click();
  await expect(section(page, "Expense").getByText("Groceries")).toBeVisible();
});

test("creates a root Category and a sub-Category", async ({ page }) => {
  await page.goto(categories);

  await section(page, "Income").getByRole("button", { name: "New Category" }).click();
  const dialog = page.getByRole("dialog", { name: "New Income Category" });
  await expectAccessible(page);
  await dialog.getByRole("textbox", { name: "Name" }).fill("Gifts");
  await dialog.getByRole("button", { name: "Create Category" }).click();
  await expect(dialog).toBeHidden();
  await expect(section(page, "Income")).toContainText("Gifts");

  await rowAction(page, "Food", "Add sub-Category");
  const sub = page.getByRole("dialog", { name: "New sub-Category" });
  await expect(sub).toContainText("Under: Food");
  await sub.getByRole("textbox", { name: "Name" }).fill("Snacks");
  await sub.getByRole("button", { name: "Create Category" }).click();
  await expect(sub).toBeHidden();
  await expect(row(page, "Food")).toContainText("Snacks");
});

test("a name a sibling already has shows on the Name field", async ({ page }) => {
  await page.goto(categories);

  await rowAction(page, "Food", "Add sub-Category");
  const dialog = page.getByRole("dialog", { name: "New sub-Category" });
  const name = dialog.getByRole("textbox", { name: "Name" });
  await name.fill(" groceries ");
  await dialog.getByRole("button", { name: "Create Category" }).click();

  await expect(name).toHaveAccessibleDescription(
    "Another Category under the same parent already has this name.",
  );
  await expect(name).toBeFocused();
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
});

test("renames a Category", async ({ page }) => {
  await page.goto(categories);

  await rowAction(page, "Groceries", "Rename…");
  const dialog = page.getByRole("dialog", { name: "Rename Category" });
  await expect(dialog).toContainText("Renaming Food › Groceries.");
  const name = dialog.getByRole("textbox", { name: "Name" });
  await expect(name).toHaveValue("Groceries");
  await name.fill("Supermarket");
  await dialog.getByRole("button", { name: "Rename" }).click();

  await expect(dialog).toBeHidden();
  await expect(row(page, "Food")).toContainText("Supermarket");
  await expect(section(page, "Expense").getByText("Groceries")).toHaveCount(0);
});

test("moves a Category under another, and to the top level", async ({ page }) => {
  await page.goto(categories);

  await rowAction(page, "Rent", "Move…");
  const dialog = page.getByRole("dialog", { name: "Move Category" });
  const picker = dialog.getByRole("combobox", { name: "Move to" });
  await expect(picker).toHaveValue("Housing");
  await picker.fill("");
  await picker.click();
  // Only Expense Categories, and Top level first.
  await expect(page.getByRole("option").first()).toHaveText("Top level");
  await expect(page.getByRole("option", { name: "Salary" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Uncategorised" })).toHaveCount(0);
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "Food", exact: true }).click();
  await dialog.getByRole("button", { name: "Move" }).click();

  await expect(dialog).toBeHidden();
  await expect(row(page, "Food")).toContainText("Rent");

  // A Category can't move under itself or its sub-Categories.
  await rowAction(page, "Food", "Move…");
  await page.getByRole("combobox", { name: "Move to" }).fill("food");
  await expect(page.getByRole("option")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await rowAction(page, "Eating out", "Move…");
  const toTop = page.getByRole("combobox", { name: "Move to" });
  await toTop.fill("top");
  await page.getByRole("option", { name: "Top level" }).click();
  await page.getByRole("button", { name: "Move" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(row(page, "Food")).not.toContainText("Eating out");
  await expect(section(page, "Expense")).toContainText("Eating out");
});
