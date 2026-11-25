import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// "Home" in the default mock scenario (src/mocks/db.ts), created by the mock
// User "Sam" on 2026-01-01. `?mock-member=Ana` adds Ana, who joined on
// 2026-03-11; `?mock-member=` adds a member with no name.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const members = `${home}/members`;

const table = (page: Page) => page.getByRole("table", { name: "Members" });
const rows = (page: Page) => table(page).getByRole("row");

test("Members in the sidebar opens the screen, with you as the only member", async ({ page }) => {
  await page.goto(home);
  const link = page.getByRole("navigation", { name: "Household" }).getByRole("link", {
    name: "Members",
  });
  await link.click();

  await expect(page).toHaveURL(members);
  await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(table(page).getByRole("columnheader")).toHaveText(["Name", "Joined"]);
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(1).getByRole("cell")).toHaveText(["Sam (you)", "Jan 1, 2026"]);
  await expect(page.getByRole("button", { name: "Set your name" })).toHaveCount(0);
  await expectAccessible(page);
});

test("two members, oldest first, with only your own row marked", async ({ page }) => {
  await page.goto(`${members}?mock-member=Ana`);

  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(1).getByRole("cell")).toHaveText(["Sam (you)", "Jan 1, 2026"]);
  await expect(rows(page).nth(2).getByRole("cell")).toHaveText(["Ana", "Mar 11, 2026"]);
  await expectAccessible(page);
});

test("a member with no name reads No name yet", async ({ page }) => {
  await page.goto(`${members}?mock-member=`);

  await expect(rows(page).nth(2).getByRole("cell")).toHaveText(["No name yet", "Mar 11, 2026"]);
  await expect(page.getByRole("button", { name: "Set your name" })).toHaveCount(0);
  await expectAccessible(page);
});

test("without a name of your own, Set your name opens Your name", async ({ page }) => {
  await page.goto(`${members}?mock-scenario=unnamed&mock-member=Ana`);

  const mine = rows(page).nth(1);
  await expect(mine.getByRole("cell").first()).toHaveText("No name yet (you) Set your name");
  await expectAccessible(page);

  await mine.getByRole("button", { name: "Set your name" }).click();
  const dialog = page.getByRole("dialog", { name: "Your name" });
  await expectAccessible(page);
  await dialog.getByRole("textbox", { name: "Display name" }).fill("Sam");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog).toBeHidden();
  await expect(mine.getByRole("cell")).toHaveText(["Sam (you)", "Jan 1, 2026"]);
  await expect(rows(page).nth(2).getByRole("cell")).toHaveText(["Ana", "Mar 11, 2026"]);
});

test("a list that fails to load says so, and Try again loads it", async ({ page }) => {
  // Every read attempt fails (three, with the retries); the next one succeeds.
  await page.goto(`${members}?mock-fail=/members:3`);

  await expect(page.getByRole("alert")).toContainText("Service Unavailable", { timeout: 15_000 });
  await expect(page.getByRole("navigation", { name: "Household" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(rows(page).nth(1)).toContainText("Sam (you)");
});
