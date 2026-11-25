import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The default mock scenario (src/mocks/db.ts): "Home" and "Cabin".
const homeId = "0190f5f2-7c00-7000-8000-000000000001";
const cabinId = "0190f5f2-7c00-7000-8000-000000000002";
const home = `/households/${homeId}`;
const cabin = `/households/${cabinId}`;

const notAMember = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "You're not a member of this Household" });

/** The Household `/` goes back to (src/lib/last-household.ts). */
const lastHousehold = (page: Page) =>
  page.evaluate(() => window.localStorage.getItem("wallet-accountant.last-household"));

test("a Household the User isn't a member of says so, and leads to their Households", async ({
  page,
}) => {
  await page.goto(cabin);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  await page.goto("/households/0190f5f2-7c00-7000-8000-00000000dead");

  await expect(notAMember(page)).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "It may have been removed from your list because a member removed you, or the link is wrong.",
  );
  await expect(page.getByRole("navigation", { name: "Household" })).toBeHidden();
  await expectAccessible(page);

  // Another Household was the last one opened, so it stays remembered.
  expect(await lastHousehold(page)).toBe(cabinId);
  await page.getByRole("link", { name: "Go to your Households" }).click();
  await expect(page).toHaveURL(cabin);
});

test("a member removing the User while the Household is open shows it on the next focus", async ({
  page,
}) => {
  await page.clock.install();
  // Opening Cabin is the one read before a member removes the User from it.
  await page.goto(`${cabin}?mock-remove-me=${cabinId}:1`);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  expect(await lastHousehold(page)).toBe(cabinId);

  // Coming back to the tab once the Household is stale refetches it.
  await page.clock.fastForward("00:31");
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));

  await expect(notAMember(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Household" })).toBeHidden();
  await expectAccessible(page);
  expect(await lastHousehold(page)).toBeNull();

  await page.getByRole("link", { name: "Go to your Households" }).click();
  await expect(page).toHaveURL(home);
  await page.getByRole("button", { name: /^Household/ }).click();
  await expect(page.getByRole("menuitemradio", { name: "Cabin" })).toBeHidden();
});
