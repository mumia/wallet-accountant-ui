import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The mock's Invitations to a Household (src/mocks/db.ts): one to "Beach
// house", which the mock User isn't in, and one to "Home", which they are.
const beachCode = "JOIN-BEACH-2026";
const homeCode = "JOIN-HOME-2026";
const beachHouse = "/households/0190f5f2-7c00-7000-8000-000000000003";
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";

const codeField = (page: Page) => page.getByRole("textbox", { name: "Invitation code" });
const joinButton = (page: Page) => page.getByRole("button", { name: "Join" });
const switcher = (page: Page) => page.getByRole("button", { name: /^Household/ });

test("a User opens an Invitation link, joins and lands in the Household", async ({ page }) => {
  await page.goto(`/join?invitation_code=${beachCode}&mock-scenario=household`);

  await expect(page.getByRole("heading", { level: 1, name: "Join a Household" })).toBeVisible();
  await expect(
    page.getByText("You're signed in as sam@example.com. Someone has invited you"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  // Prefilled, not redeemed: joining is a press.
  await expect(codeField(page)).toHaveValue(beachCode);
  await expect(page).toHaveURL(`/join?invitation_code=${beachCode}`);
  await expectAccessible(page);

  await joinButton(page).click();

  await expect(page).toHaveURL(beachHouse);
  await expect(switcher(page)).toContainText("Beach house");
  await switcher(page).click();
  await expect(page.getByRole("menuitemradio")).toHaveText(["Home", "Cabin", "Beach house"]);
  await page.keyboard.press("Escape");

  // `/` now goes to the Household just joined.
  await page.goto("/");
  await expect(page).toHaveURL(beachHouse);

  // The code worked once.
  await page.goto(`/join?invitation_code=${beachCode}`);
  await joinButton(page).click();
  await expect(page.getByRole("alert")).toContainText("Invalid Invitation code");
});

test("a link to a Household the User is already in says so", async ({ page }) => {
  await page.goto(`/join?invitation_code=${homeCode}&mock-scenario=household`);

  await joinButton(page).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Already a member");
  await expect(alert).toContainText("The Invitation code is still unused.");
  await expect(page).toHaveURL(`/join?invitation_code=${homeCode}`);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Go to your Households" }).click();
  await expect(page).toHaveURL(home);
});

test("an invalid code shows the problem and keeps the input", async ({ page }) => {
  await page.goto("/join?mock-scenario=household");

  await joinButton(page).click();
  await expect(codeField(page)).toHaveAccessibleDescription(
    "Type the Invitation code you were given",
  );
  await expectAccessible(page);

  await codeField(page).fill("NOT-A-CODE");
  await joinButton(page).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Invalid Invitation code");
  await expect(alert).toContainText(
    "The Invitation code is unknown, expired, revoked, superseded or already used.",
  );
  await expect(page.getByRole("link", { name: "Go to your Households" })).toHaveCount(0);
  await expect(codeField(page)).toHaveValue("NOT-A-CODE");
  await expectAccessible(page);
});

test("someone who isn't a User yet is sent to /register with the code", async ({ page }) => {
  await page.goto(`/join?invitation_code=${beachCode}&mock-scenario=new-user`);

  await expect(page).toHaveURL(`/register?invitation_code=${beachCode}`);
  await expect(codeField(page)).toHaveValue(beachCode);

  await page.getByRole("textbox", { name: "Display name" }).fill("Ana");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page).toHaveURL(beachHouse);
});
