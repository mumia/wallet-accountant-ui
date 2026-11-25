import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The default mock scenario's User is "Sam"; the token's name is "Sam Example".
// `unnamed` is the same User with no display name (src/mocks/db.ts).
const userMenu = (page: Page) => page.getByRole("button", { name: /^Sam|^Ana/ });

async function openYourName(page: Page, item: "Your name…" | "Set your name…") {
  await userMenu(page).click();
  await page.getByRole("menuitem", { name: item }).click();
  return page.getByRole("dialog", { name: "Your name" });
}

test("a User without a display name is invited to set one", async ({ page }) => {
  await page.goto("/?mock-scenario=unnamed");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  // The token's name stands in, with a dot that says the name isn't set.
  await expect(userMenu(page)).toHaveAccessibleName(/^Sam Example.*Your name isn't set/);
  await expectAccessible(page);

  const dialog = await openYourName(page, "Set your name…");
  await expect(dialog).toContainText("Other members of your Households see this name.");
  const name = dialog.getByRole("textbox", { name: "Display name" });
  await expect(name).toHaveValue("");
  await expectAccessible(page);

  await name.fill("  Ana  ");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog).toBeHidden();
  await expect(userMenu(page)).toHaveAccessibleName(/^Ana/);
  await expect(userMenu(page)).not.toHaveAccessibleName(/Your name isn't set/);
  await userMenu(page).click();
  await expect(page.getByRole("menuitem", { name: "Your name…" })).toBeVisible();
});

test("changes the display name, and it stays after a reload", async ({ page }) => {
  await page.goto("/");
  await expect(userMenu(page)).toHaveAccessibleName(/^Sam sam@example\.com$/);

  const dialog = await openYourName(page, "Your name…");
  const name = dialog.getByRole("textbox", { name: "Display name" });
  await expect(name).toHaveValue("Sam");

  await name.fill("Samantha");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(userMenu(page)).toHaveAccessibleName(/^Samantha/);

  await page.reload();
  await expect(userMenu(page)).toHaveAccessibleName(/^Samantha/);
});

test("a blank or too long name shows on the Display name field", async ({ page }) => {
  await page.goto("/");
  const dialog = await openYourName(page, "Your name…");
  const name = dialog.getByRole("textbox", { name: "Display name" });

  await name.fill("x".repeat(65));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(name).toHaveAccessibleDescription("A display name has at most 64 characters");
  await expect(name).toBeFocused();
  await expectAccessible(page);

  await name.fill("   ");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(name).toHaveAccessibleDescription("Type the name others in your Household will see");

  // 64 characters is still a name.
  await name.fill("x".repeat(64));
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
});

test("a refused change stays in the dialog", async ({ page }) => {
  // The change and its two retries fail.
  await page.goto("/?mock-fail=PATCH:3");
  const dialog = await openYourName(page, "Your name…");

  await dialog.getByRole("textbox", { name: "Display name" }).fill("Samantha");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog.getByRole("alert")).toContainText("Service Unavailable");
  await expect(dialog.getByRole("textbox", { name: "Display name" })).toHaveValue("Samantha");
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(userMenu(page)).toHaveAccessibleName(/^Samantha/);
});
