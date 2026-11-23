import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// The mock API's data per tab (src/mocks/db.ts): `?mock-scenario=` starts over.
const validCode = "WELCOME-2026";

const codeField = (page: Page) => page.getByRole("textbox", { name: "Invitation code" });
const nameField = (page: Page) => page.getByRole("textbox", { name: "Display name" });

test("a new User redeems an Invitation and creates their first Household", async ({ page }) => {
  await page.goto("/?mock-scenario=new-user");

  await expect(page).toHaveURL("/register");
  await expect(
    page.getByRole("heading", { level: 1, name: "Join Wallet Accountant" }),
  ).toBeVisible();
  await expect(page.getByText("You're signed in as sam@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expectAccessible(page);

  await codeField(page).fill(validCode);
  await nameField(page).fill("Sam");
  await page.getByRole("button", { name: "Redeem" }).click();

  await expect(page).toHaveURL("/households/new");
  await expect(
    page.getByRole("heading", { level: 1, name: "Create your Household" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  const currency = page.getByRole("combobox", { name: "Base currency" });
  await expect(currency).toHaveValue("");
  await expect(currency).toHaveAccessibleDescription(/can't be changed later/);
  await expectAccessible(page);

  await page.getByRole("textbox", { name: "Name" }).fill("Our home");
  await currency.fill("eur");
  await expect(page.getByRole("option", { name: "EUR — Euro" })).toBeVisible();
  await expectAccessible(page, comboboxListOpen);
  await page.getByRole("option", { name: "EUR — Euro" }).click();
  await expect(currency).toHaveValue("EUR — Euro");
  await page.getByRole("button", { name: "Create Household" }).click();

  await expect(page).toHaveURL(/\/households\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: /^Household/ })).toContainText("Our home");
  await expect(page.getByText("Add your first Account.")).toBeVisible();
  const home = page.url();
  await expectAccessible(page);

  // `/` now goes to the Household last opened.
  await page.goto("/");
  await expect(page).toHaveURL(home);
});

test("an Invitation link prefills the code without redeeming it", async ({ page }) => {
  await page.goto(`/register?invitation_code=${validCode}&mock-scenario=new-user`);

  await expect(codeField(page)).toHaveValue(validCode);
  await expect(page).toHaveURL(`/register?invitation_code=${validCode}`);
  await expectAccessible(page);

  await nameField(page).fill("Sam");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page).toHaveURL("/households/new");
});

test("an invalid code shows the problem and keeps the input", async ({ page }) => {
  await page.goto("/register?mock-scenario=new-user");

  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(codeField(page)).toHaveAccessibleDescription(
    "Type the Invitation code you were given",
  );
  await expectAccessible(page);

  await codeField(page).fill("NOT-A-CODE");
  await nameField(page).fill("Sam");
  await page.getByRole("button", { name: "Redeem" }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Invalid Invitation code" });
  await expect(alert).toContainText(
    "The Invitation code is unknown, expired, superseded or already used.",
  );
  await expect(codeField(page)).toHaveValue("NOT-A-CODE");
  await expect(page).toHaveURL("/register");
  await expectAccessible(page);
});

test("a Display name must not be blank or too long", async ({ page }) => {
  await page.goto(`/register?invitation_code=${validCode}&mock-scenario=new-user`);

  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(nameField(page)).toHaveAccessibleDescription(
    "Type the name others in your Household will see",
  );

  await nameField(page).fill("   ");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(nameField(page)).toHaveAccessibleDescription(
    "Type the name others in your Household will see",
  );

  await nameField(page).fill("x".repeat(65));
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(nameField(page)).toHaveAccessibleDescription(
    "A display name has at most 64 characters",
  );
  await expect(page).toHaveURL(`/register?invitation_code=${validCode}`);
  await expectAccessible(page);

  // Spaces around a name are fine.
  await nameField(page).fill("  Sam  ");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page).toHaveURL("/households/new");
});

test("someone already registered who redeems again goes on as a User", async ({ page }) => {
  await page.goto("/register?mock-scenario=registered");

  await codeField(page).fill("USED-BEFORE");
  await nameField(page).fill("Sam");
  await page.getByRole("button", { name: "Redeem" }).click();

  await expect(page).toHaveURL("/households/new");
});

test("Create Household checks its fields before sending", async ({ page }) => {
  await page.goto("/?mock-scenario=registered");
  await expect(page).toHaveURL("/households/new");

  await page.getByRole("button", { name: "Create Household" }).click();

  await expect(page.getByRole("textbox", { name: "Name" })).toHaveAccessibleDescription(
    "Give the Household a name",
  );
  await expect(page.getByRole("combobox", { name: "Base currency" })).toHaveAccessibleDescription(
    /Choose a Base currency/,
  );
  await expect(page).toHaveURL("/households/new");
  await expectAccessible(page);
});

test("a Household that isn't the User's is not found", async ({ page }) => {
  await page.goto("/households/0190f5f2-7c00-7000-8000-00000000dead");

  await expect(page.getByRole("heading", { level: 1, name: "Not found" })).toBeVisible();
  await expectAccessible(page);
});

test("leaving the Base currency list closes it and shows the page again", async ({ page }) => {
  await page.goto("/households/new?mock-scenario=registered");
  const currency = page.getByRole("combobox", { name: "Base currency" });

  await currency.fill("j");
  await expect(page.getByRole("option", { name: "JPY — Japanese Yen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Household" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();

  await currency.fill("j");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(page.locator("[aria-hidden=true]:has(button, input)")).toHaveCount(0);
  await expectAccessible(page);
});
