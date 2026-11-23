import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// Savings in the default mock scenario (src/mocks/db.ts), start 2026-08-01:
// August (closed at €1,200.00) and September (€1,400.00) closed; October open,
// with a €200.00 deposit Accepted and €2.10 Interest pending (computed balance
// €1,600.00); November not open yet, with a deposit pending and, from a second
// import, a Suspected duplicate of it.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const savings = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000103`;
const creditCard = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000102`;
const interest = "Oct 31, 2026, Interest, €2.10";
const repeat = "Nov 5, 2026, Transfer from Main, €200.00";

// Whether a month has ended depends on the clock: keep it at 22 Nov 2026.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

const statementBalance = (page: Page) =>
  page.getByRole("textbox", { name: "Statement balance (EUR)" });

test("the Months tab lists the months newest first, with their state and counts", async ({
  page,
}) => {
  await page.goto(`${savings}/months`);

  await expect(page.getByRole("row")).toHaveText([
    "MonthStatePendingSuspected duplicatesUncategorised",
    "November 2026Not open yet110",
    "October 2026Open100",
    "September 2026Closed000",
    "August 2026Closed000",
  ]);
  await expectAccessible(page);

  await page.getByRole("link", { name: "October 2026" }).click();
  await expect(page).toHaveURL(`${savings}/months/2026-10`);
  await expect(page.getByRole("heading", { level: 2, name: "October 2026" })).toBeVisible();
});

test("a refused close shows its reasons; once they are fixed the month closes, and reopens", async ({
  page,
}) => {
  await page.goto(`${savings}/months/2026-10`);
  await expect(page.getByRole("link", { name: "1 row to review" })).toHaveAttribute(
    "href",
    `${savings}/to-review?booking_month=2026-10`,
  );
  await expect(page.getByText("Computed balance €1,600.00")).toBeVisible();
  await statementBalance(page).fill("1700");
  await expect(page.getByText("Computed balance €1,600.00 · Difference €100.00")).toBeVisible();
  await expect(
    page.getByText(
      "Closing makes October 2026 read-only, except Categories, and opens November 2026.",
    ),
  ).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Close October 2026" }).click();
  const refusal = page.getByRole("alert").filter({ hasText: "October 2026 can't close yet" });
  await expect(refusal.getByRole("link", { name: "1 row to review" })).toBeVisible();
  await expect(refusal.getByRole("definition")).toHaveText(["€1,600.00", "€1,700.00", "€100.00"]);
  // The input stays.
  await expect(statementBalance(page)).toHaveValue("1,700.00");
  await expectAccessible(page);

  // Fix it: Accept the Interest with a Category.
  await refusal.getByRole("link", { name: "1 row to review" }).click();
  const picker = page.getByRole("combobox", { name: `Category for ${interest}` });
  await picker.fill("Salary");
  await page.getByRole("option", { name: "Salary" }).click();
  await page.getByRole("button", { name: `Accept ${interest}` }).click();
  await expect(page.getByRole("button", { name: `Accept ${interest}` })).toHaveCount(0);

  await page.goto(`${savings}/months/2026-10`);
  await expect(page.getByText("Nothing stops October 2026 closing.")).toBeVisible();
  await statementBalance(page).fill("1602.10");
  await expect(page.getByText("Computed balance €1,602.10 · Difference €0.00")).toBeVisible();
  await page.getByRole("button", { name: "Close October 2026" }).click();

  // On to November, which hasn't ended.
  await expect(page).toHaveURL(`${savings}/months/2026-11`);
  await expect(page.getByText("October 2026 closed. November 2026 is open.")).toBeVisible();
  await expect(page.getByText("You can close November 2026 from Dec 1, 2026.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close November 2026" })).toBeDisabled();
  await expect(statementBalance(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: "No later month" })).toBeDisabled();
  await expectAccessible(page);

  // October is now the latest closed month, and November has nothing Accepted.
  await page.getByRole("link", { name: "Previous month: October 2026" }).click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect(page.getByRole("definition").first()).toHaveText("€1,602.10");
  await expect(page.getByText(/^Closed on /)).toBeVisible();
  await page.getByRole("button", { name: "Reopen October 2026" }).click();
  const dialog = page.getByRole("dialog", { name: "Reopen October 2026?" });
  await expect(dialog).toHaveAccessibleDescription(
    "November 2026 goes back to not open yet and October 2026 becomes editable again. You'll need to close October 2026 again with its Statement balance.",
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Reopen" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("October 2026 is open again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close October 2026" })).toBeEnabled();
});

test("Reopen is only on the latest closed month, and blocked while the open month has Accepted Transactions", async ({
  page,
}) => {
  await page.goto(`${savings}/months/2026-09`);

  const reopen = page.getByRole("button", { name: "Reopen September 2026" });
  await expect(reopen).toBeDisabled();
  await expect(reopen).toHaveAccessibleDescription(
    "October 2026 has Accepted Transactions. Reverse them first. See October 2026's Transactions",
  );
  await expect(page.getByRole("link", { name: "See October 2026's Transactions" })).toHaveAttribute(
    "href",
    `${savings}/transactions?booking_month=2026-10`,
  );
  await expectAccessible(page);

  await page.getByRole("link", { name: "Previous month: August 2026" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "August 2026" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reopen/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "No earlier month" })).toBeDisabled();
});

test("a month not open yet, a month outside the Account, and an Account awaiting its first import", async ({
  page,
}) => {
  await page.goto(`${savings}/months/2026-11`);
  await expect(page.getByText("Not open yet", { exact: true })).toBeVisible();
  await expect(page.getByText("November 2026 opens when October 2026 closes.")).toBeVisible();
  await expect(page.getByText("1 row is waiting in November 2026.")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: "Close October 2026 first" }).click();
  await expect(page).toHaveURL(`${savings}/months/2026-10`);

  // A Suspected duplicate there needn't wait.
  await page.goto(`${savings}/months/2026-11`);
  await page.getByRole("link", { name: "1 Suspected duplicate can be decided now" }).click();
  await expect(page).toHaveURL(
    `${savings}/to-review?booking_month=2026-11&state=SUSPECTED_DUPLICATE`,
  );
  await expect(page.getByRole("button", { name: `Keep ${repeat}` })).toBeVisible();

  await page.goto(`${savings}/months/2026-07`);
  await expect(page.getByText("July 2026 isn't a month of this Account.")).toBeVisible();
  await page.getByRole("link", { name: "See all months" }).click();
  await expect(page).toHaveURL(`${savings}/months`);

  await page.goto(`${creditCard}/months/2026-11`);
  await expect(
    page.getByText("Months open once the first Statement import records the Opening balance."),
  ).toBeVisible();
  await expectAccessible(page);
});

test("To review locks Pending rows in a month not open yet", async ({ page }) => {
  await page.goto(`${savings}/to-review`);

  const locked = page
    .getByRole("region", { name: "Pending" })
    .getByRole("row")
    .filter({ hasText: "Nov 5, 2026" });
  await expect(locked).toContainText("November 2026 isn't open yet");
  await expect(locked.getByRole("button")).toHaveCount(0);
  await expect(locked.getByRole("checkbox")).toBeDisabled();
  await expect(locked.getByRole("combobox")).toHaveCount(0);
  await expectAccessible(page);

  // Select all leaves it out.
  await page.getByRole("checkbox", { name: "Select all Pending rows" }).click();
  await expect(page.getByRole("status").filter({ hasText: "selected" })).toHaveText("1 selected");
  await expect(page.getByRole("checkbox", { name: `Select ${interest}` })).toBeChecked();
});

test("a Suspected duplicate in a month not open yet can be kept, and then waits", async ({
  page,
}) => {
  await page.goto(`${savings}/to-review`);
  const suspected = page.getByRole("region", { name: "Suspected duplicates" });
  await expect(suspected.getByRole("row").filter({ hasText: "Nov 5, 2026" })).not.toContainText(
    "isn't open yet",
  );
  await expect(suspected.getByRole("checkbox", { name: `Select ${repeat}` })).toBeEnabled();
  await expectAccessible(page);

  await page.getByRole("button", { name: `Keep ${repeat}` }).click();

  await expect(suspected).toHaveCount(0);
  const kept = page
    .getByRole("region", { name: "Pending" })
    .getByRole("row")
    .filter({ hasText: "Resembles" });
  await expect(kept).toContainText("November 2026 isn't open yet");
  await expect(kept.getByRole("button")).toHaveCount(0);
  await page.reload();
  await expect(kept).toContainText("November 2026 isn't open yet");
});

test("a Suspected duplicate in a month not open yet can be Discarded", async ({ page }) => {
  await page.goto(`${savings}/to-review`);

  await page.getByRole("button", { name: `Discard ${repeat}` }).click();
  await page
    .getByRole("dialog", { name: "Discard this row?" })
    .getByRole("button", { name: "Discard" })
    .click();

  await expect(page.getByRole("region", { name: "Suspected duplicates" })).toHaveCount(0);
  await page.goto(`${savings}/months/2026-11`);
  await expect(page.getByRole("link", { name: /Suspected duplicate/ })).toHaveCount(0);
});
