import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// Home in the default mock scenario (src/mocks/db.ts) has three Notifications,
// newest first: Main's import found 1 Suspected duplicate (unread), a kind this
// build doesn't know, BALANCE_CHECK_FAILED (unread), and an older Suspected
// duplicates one (read).
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;

const bell = (page: Page) => page.getByRole("button", { name: /^Notifications/ });
const panel = (page: Page) => page.getByRole("dialog", { name: "Notifications" });

test("the bell counts unread Notifications, and one opens its Suspected duplicates", async ({
  page,
}) => {
  await page.goto(home);
  await expect(bell(page)).toHaveAccessibleName("Notifications, 2 unread");
  await expect(bell(page)).toHaveText("2");

  await bell(page).click();
  await expect(panel(page).getByRole("listitem")).toHaveText([
    /^Unread: 1 Suspected duplicate to review in MainNov 21, 2026/,
    /^Unread: BALANCE_CHECK_FAILEDNov 20, 2026/,
    /^2 Suspected duplicates to review in MainOct 15, 2026/,
  ]);
  // An unknown kind is shown as sent, with nowhere to go.
  await expect(panel(page).getByRole("button", { name: /BALANCE_CHECK_FAILED/ })).toHaveCount(0);
  await expectAccessible(page);

  await panel(page)
    .getByRole("button", { name: /^Unread: 1 Suspected duplicate to review in Main/ })
    .click();
  await expect(page).toHaveURL(`${main}/to-review?state=SUSPECTED_DUPLICATE`);
  await expect(panel(page)).toBeHidden();
  await expect(bell(page)).toHaveAccessibleName("Notifications, 1 unread");

  // Read for good.
  await page.reload();
  await expect(bell(page)).toHaveAccessibleName("Notifications, 1 unread");
  await bell(page).click();
  await expect(panel(page).getByRole("listitem").first()).toHaveText(
    /^1 Suspected duplicate to review in Main/,
  );
});

test("a Statement import with Suspected duplicates shows up on the bell soon after", async ({
  page,
}) => {
  await page.goto(
    `${main}/statement-imports/new?connection_id=0190f5f2-7c00-7000-8000-000000000202`,
  );
  await page.getByLabel("Choose a file").setInputFiles({
    name: "week-47.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      ["Date;Description;Amount;Id", "2026-11-14;Shell Express;-38.50;NL-1114-09"].join("\n"),
    ),
  });
  await page.getByRole("textbox", { name: "Export balance (EUR)" }).fill("1000");
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Statement imported")).toBeVisible();

  // Reread about 3 s after the import, well before the 60 s poll.
  await expect(bell(page)).toHaveAccessibleName("Notifications, 3 unread", { timeout: 8_000 });
});
