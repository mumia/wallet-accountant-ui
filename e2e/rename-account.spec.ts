import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// Main in "Home", the default mock scenario (src/mocks/db.ts).
const main =
  "/households/0190f5f2-7c00-7000-8000-000000000001/accounts/0190f5f2-7c00-7000-8000-000000000101";

async function openRename(page: Page) {
  await page.getByRole("button", { name: "More Account actions" }).click();
  await page.getByRole("menuitem", { name: "Rename…" }).click();
  return page.getByRole("dialog", { name: "Rename Account" });
}

test("renames an Account, and the header and sidebar follow", async ({ page }) => {
  await page.goto(`${main}/transactions`);
  await expect(page.getByRole("heading", { level: 1, name: "Main" })).toBeVisible();

  const dialog = await openRename(page);
  await expect(dialog).toContainText("Only the name can change");
  const name = dialog.getByRole("textbox", { name: "Name" });
  await expect(name).toHaveValue("Main");
  await expectAccessible(page);

  await name.fill("  Everyday  ");
  await dialog.getByRole("button", { name: "Rename" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Everyday" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Household" }).getByRole("link", { name: /Everyday/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(`${main}/transactions`);
});

test("a blank or too long name shows on the Name field", async ({ page }) => {
  await page.goto(`${main}/transactions`);
  const dialog = await openRename(page);
  const name = dialog.getByRole("textbox", { name: "Name" });

  await name.fill("x".repeat(201));
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(name).toHaveAccessibleDescription("A name has at most 200 characters");
  await expect(name).toBeFocused();
  await expectAccessible(page);

  await name.fill("   ");
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(name).toHaveAccessibleDescription("Give the Account a name");

  // 200 characters is still a name.
  await name.fill("x".repeat(200));
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "x".repeat(200) })).toBeVisible();
});

test("a refused rename stays in the dialog", async ({ page }) => {
  // The rename and its two retries fail.
  await page.goto(`${main}/transactions?mock-fail=PATCH:3`);
  const dialog = await openRename(page);

  await dialog.getByRole("textbox", { name: "Name" }).fill("Everyday");
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Everyday" })).toBeVisible();
});
