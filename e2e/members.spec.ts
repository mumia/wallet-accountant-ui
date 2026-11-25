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
  await expect(table(page).getByRole("columnheader")).toHaveText(["Name", "Joined", "Actions"]);
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(1).getByRole("cell")).toHaveText(["Sam (you)", "Jan 1, 2026", ""]);
  await expect(page.getByRole("button", { name: "Set your name" })).toHaveCount(0);
  await expectAccessible(page);
});

test("two members, oldest first, with only your own row marked", async ({ page }) => {
  await page.goto(`${members}?mock-member=Ana`);

  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(1).getByRole("cell")).toHaveText(["Sam (you)", "Jan 1, 2026", ""]);
  await expect(rows(page).nth(2).getByRole("cell")).toHaveText(["Ana", "Mar 11, 2026", "Remove…"]);
  await expectAccessible(page);
});

test("a member with no name reads No name yet", async ({ page }) => {
  await page.goto(`${members}?mock-member=`);

  await expect(rows(page).nth(2).getByRole("cell")).toHaveText([
    "No name yet",
    "Mar 11, 2026",
    "Remove…",
  ]);
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
  await expect(mine.getByRole("cell")).toHaveText(["Sam (you)", "Jan 1, 2026", ""]);
  await expect(rows(page).nth(2).getByRole("cell")).toHaveText(["Ana", "Mar 11, 2026", "Remove…"]);
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

const cabin = "/households/0190f5f2-7c00-7000-8000-000000000002";
const beachHouse = "/households/0190f5f2-7c00-7000-8000-000000000003";
const leaveButton = (page: Page) => page.getByRole("button", { name: "Leave Household…" });
const switcher = (page: Page) => page.getByRole("button", { name: /^Household/ });

test("Leave is disabled, with the reason, for the only member", async ({ page }) => {
  await page.goto(members);

  await expect(leaveButton(page)).toBeDisabled();
  await expect(leaveButton(page)).toHaveAccessibleDescription(
    "You're the only member. A Household always keeps at least one.",
  );
  await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  await expectAccessible(page);
});

test("Remove asks first, then the member is gone", async ({ page }) => {
  await page.goto(`${members}?mock-member=Ana`);

  await expect(leaveButton(page)).toBeEnabled();
  await page.getByRole("button", { name: "Remove Ana…" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Remove Ana?" });
  await expect(dialog).toContainText(
    "They lose access to Home at once. They can come back only with a new Invitation.",
  );
  await expectAccessible(page);

  // Cancel keeps her.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(3);

  await page.getByRole("button", { name: "Remove Ana…" }).click();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(1)).toContainText("Sam (you)");
  // Now alone, you can't leave.
  await expect(leaveButton(page)).toBeDisabled();
});

test("a member with no name is named by when they joined", async ({ page }) => {
  await page.goto(`${members}?mock-member=`);

  await page.getByRole("button", { name: "Remove the member who joined Mar 11, 2026…" }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Remove the member who joined Mar 11, 2026?" }),
  ).toBeVisible();
});

test("removing a member who is gone already closes the dialog with a toast", async ({ page }) => {
  // Ana leaves, from another browser, just before Remove.
  await page.goto(`${members}?mock-member=Ana&mock-others-leave`);

  await page.getByRole("button", { name: "Remove Ana…" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Remove Ana?" });
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Couldn't remove Ana")).toBeVisible();
  await expect(page.getByText("Not Found")).toBeVisible();
  await expect(rows(page)).toHaveCount(2);
  await expectAccessible(page);
});

test("Leave asks first, then lands in another Household", async ({ page }) => {
  await page.goto(`${members}?mock-member=Ana`);

  await leaveButton(page).click();
  const dialog = page.getByRole("alertdialog", { name: "Leave Home?" });
  await expect(dialog).toContainText(
    "You lose access at once. You can come back only with a new Invitation from a member.",
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Leave", exact: true }).click();

  await expect(page).toHaveURL(cabin);
  await expect(switcher(page)).toContainText("Cabin");
  await switcher(page).click();
  await expect(page.getByRole("menuitemradio")).toHaveText(["Cabin"]);
  await page.keyboard.press("Escape");

  // `/` doesn't go back to Home.
  await page.goto("/");
  await expect(page).toHaveURL(cabin);
});

test("leaving your only Household lands on Create Household", async ({ page }) => {
  // Beach house, which Rui is in, becomes the User's only Household.
  await page.goto("/join?invitation_code=JOIN-BEACH-2026&mock-scenario=registered");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page).toHaveURL(beachHouse);
  await page.goto(`${beachHouse}/members`);

  await leaveButton(page).click();
  await page
    .getByRole("alertdialog", { name: "Leave Beach house?" })
    .getByRole("button", { name: "Leave", exact: true })
    .click();

  await expect(page).toHaveURL("/households/new");
});

test("a Leave that races the others leaving is refused in the dialog", async ({ page }) => {
  // The page shows Ana, but she leaves, from another browser, just before Leave.
  await page.goto(`${members}?mock-member=Ana&mock-others-leave`);

  await leaveButton(page).click();
  const dialog = page.getByRole("alertdialog", { name: "Leave Home?" });
  await dialog.getByRole("button", { name: "Leave", exact: true }).click();

  await expect(dialog.getByRole("alert")).toContainText(
    "Last memberThe only member of a Household can't leave it.",
  );
  await expect(page).toHaveURL(members);
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(2);
  await expect(leaveButton(page)).toBeDisabled();
});
