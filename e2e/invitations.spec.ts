import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// "Home" in the default mock scenario (src/mocks/db.ts), whose only member is
// the mock User "Sam", with no open Invitations. `?mock-invitation=me` adds one
// Sam issued an hour ago; `?mock-invitation=Ana` one issued by the member Ana
// (added with `?mock-member=Ana`), and `?mock-invitation=` one by a member with
// no name.
const homePath = "/households/0190f5f2-7c00-7000-8000-000000000001";
const members = `${homePath}/members`;
const emptyText =
  "No open Invitations. An Invitation works once and expires 24 hours after it's issued.";

const section = (page: Page) => page.getByRole("region", { name: "Open Invitations" });
const table = (page: Page) => page.getByRole("table", { name: "Open Invitations" });
const rows = (page: Page) => table(page).getByRole("row");
const toasts = (page: Page) => page.getByRole("region", { name: /Notifications/ });

test("with nothing open, the section says how Invitations work", async ({ page }) => {
  await page.goto(members);

  await expect(page.getByRole("heading", { level: 2, name: "Open Invitations" })).toBeVisible();
  await expect(section(page)).toContainText(emptyText);
  await expect(table(page)).toHaveCount(0);
  await expect(section(page).getByRole("button", { name: "Invite someone" })).toBeVisible();
  await expectAccessible(page);
});

test("open Invitations list who issued each, when, and when it expires", async ({ page }) => {
  await page.goto(
    `${members}?mock-member=Ana&mock-member=&mock-invitation=Ana&mock-invitation=&mock-invitation=me`,
  );

  await expect(table(page).getByRole("columnheader")).toHaveText([
    "Issued by",
    "Issued",
    "Expires",
    "Actions",
  ]);
  await expect(rows(page)).toHaveCount(4);
  const issuers = rows(page).locator("td:first-child");
  await expect(issuers).toHaveText(["Ana", "No name yet", "you"]);
  // Date and time, issued an hour ago and expiring a day after.
  await expect(rows(page).nth(1).getByRole("cell").nth(1)).toHaveText(
    /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M$/,
  );
  await expect(
    rows(page)
      .nth(3)
      .getByRole("button", { name: /^Revoke… the Invitation issued by you on / }),
  ).toBeVisible();
  await expectAccessible(page);
});

test("Invite someone issues an Invitation, shows its link and code once, then lists it without the code", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(members);

  await section(page).getByRole("button", { name: "Invite someone" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite someone to Home" });
  await expect(dialog).toContainText(
    "Whoever opens the link becomes a member and sees all of this Household's Accounts, Transactions and history. Send it only to the person you mean.",
  );
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Create Invitation" }).click();
  const link = dialog.getByRole("textbox", { name: "Invitation link" });
  const codeField = dialog.getByRole("textbox", { name: "Code" });
  await expect(codeField).not.toHaveValue("");
  const code = await codeField.inputValue();
  await expect(link).toHaveValue(`http://localhost:4173/join?invitation_code=${code}`);
  await expect(link).toHaveAttribute("readonly");
  const warning = dialog.getByText(/^It works once and expires /);
  await expect(warning).toContainText("You won't see this code again after you close this dialog.");
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Copy link" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `http://localhost:4173/join?invitation_code=${code}`,
  );
  await dialog.getByRole("button", { name: "Copy code" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
  const warningText = await warning.textContent();

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(2);
  const cells = rows(page).nth(1).getByRole("cell");
  await expect(cells.first()).toHaveText("you");
  const expires = (await cells.nth(2).textContent()) ?? "";
  expect(warningText).toContain(`expires ${expires}.`);
  await expect(page.locator("body")).not.toContainText(code);
  await expectAccessible(page);

  // The next Invite starts again at step 1.
  await section(page).getByRole("button", { name: "Invite someone" }).click();
  await expect(dialog.getByRole("button", { name: "Create Invitation" })).toBeVisible();
});

test("a failed issue shows in the dialog, and trying again issues one", async ({ page }) => {
  await page.goto(`${members}?mock-fail=POST:3`);

  await section(page).getByRole("button", { name: "Invite someone" }).click();
  const dialog = page.getByRole("dialog", { name: "Invite someone to Home" });
  await dialog.getByRole("button", { name: "Create Invitation" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Service Unavailable", { timeout: 15_000 });
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Create Invitation" }).click();
  await expect(dialog.getByRole("textbox", { name: "Code" })).not.toHaveValue("");
  await dialog.getByRole("button", { name: "Close" }).first().click();
  await expect(rows(page)).toHaveCount(2);
});

test("Revoke asks first, then the Invitation leaves the list", async ({ page }) => {
  await page.goto(`${members}?mock-invitation=me`);

  await rows(page)
    .nth(1)
    .getByRole("button", { name: /^Revoke…/ })
    .click();
  const dialog = page.getByRole("alertdialog", { name: "Revoke this Invitation?" });
  await expect(dialog).toContainText("Its link stops working at once.");
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(page)).toHaveCount(2);

  await rows(page)
    .nth(1)
    .getByRole("button", { name: /^Revoke…/ })
    .click();
  await dialog.getByRole("button", { name: "Revoke" }).click();
  await expect(dialog).toBeHidden();
  await expect(section(page)).toContainText(emptyText);
  await expectAccessible(page);
});

test("revoking an Invitation that's no longer open closes the dialog with a toast and refreshes", async ({
  page,
}) => {
  await page.goto(`${members}?mock-invitation=me`);
  await expect(rows(page)).toHaveCount(2);

  // Another member revokes it meanwhile; this screen's list is still fresh.
  await page.evaluate(async (path) => {
    const list = (await (await fetch(`/api${path}/invitations`)).json()) as {
      items: { invitation_id: string }[];
    };
    const [invitation] = list.items;
    if (invitation !== undefined) {
      await fetch(`/api${path}/invitations/${invitation.invitation_id}`, { method: "DELETE" });
    }
  }, homePath);

  await rows(page)
    .nth(1)
    .getByRole("button", { name: /^Revoke…/ })
    .click();
  const dialog = page.getByRole("alertdialog", { name: "Revoke this Invitation?" });
  await dialog.getByRole("button", { name: "Revoke" }).click();

  await expect(dialog).toBeHidden();
  await expect(toasts(page)).toContainText("That Invitation was no longer open");
  await expect(toasts(page)).toContainText("Not Found");
  await expect(section(page)).toContainText(emptyText);
  await expectAccessible(page);
});
