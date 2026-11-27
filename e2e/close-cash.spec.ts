import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// Home in the default mock scenario (src/mocks/db.ts). Each test adds its own
// cash Account, Wallet, counted at €40.00 on 5 October 2026: October is its
// open month, and it has ended by the clock below.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";

const toast = (page: Page, text: string) => page.getByRole("dialog").filter({ hasText: text });

/** Adds Wallet and opens its October. */
async function addWallet(page: Page) {
  await page.goto(home);
  // The mock API serves the page once it shows.
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  const walletId = await page.evaluate(async (path) => {
    const response = await fetch(`/api${path}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"name":"Wallet","kind":"CASH","currency":"EUR","start_date":"2026-10-05","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
    });
    return ((await response.json()) as { account_id: string }).account_id;
  }, home);
  const wallet = `${home}/accounts/${walletId}`;
  await page.goto(`${wallet}/months/2026-10`);
  await expect(
    page.getByRole("heading", { level: 2, name: "October 2026", exact: true }),
  ).toBeVisible();
  return wallet;
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

test("closing a cash month by a count: refused, the difference recorded, closed, reopened", async ({
  page,
}) => {
  await addWallet(page);
  const count = page.getByRole("textbox", { name: "Cash count (EUR)" });
  const countedOn = page.getByRole("textbox", { name: "Counted on" });
  const closeButton = page.getByRole("button", { name: "Close October 2026" });

  // The form: the count and the day, with no live difference.
  await expect(countedOn).toHaveValue("11/22/2026");
  await expect(page.getByText(/Computed balance/)).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Statement balance (EUR)" })).toHaveCount(0);
  await expectAccessible(page);

  // A day inside the month is refused by the form.
  await count.fill("37.50");
  await countedOn.fill("10/31/2026");
  await closeButton.click();
  await expect(countedOn).toHaveAccessibleDescription(
    /Count after October 2026 ends: from November 1, 2026/,
  );
  // And so is a day after today.
  await countedOn.fill("11/23/2026");
  await closeButton.click();
  await expect(countedOn).toHaveAccessibleDescription(
    /The latest day is November 22, 2026: today, in UTC/,
  );

  // The books on Counted on disagree with the count. (The mock refuses a cash
  // close without counted_on, so this refusal shows it was sent.)
  await countedOn.fill("11/03/2026");
  await closeButton.click();
  const refusal = page.getByRole("alert").filter({ hasText: "October 2026 can't close yet" });
  await expect(refusal).toContainText("The count differs from the books");
  await expect(refusal.getByRole("definition")).toHaveText(["€40.00", "€37.50", "-€2.50"]);
  await expect(refusal.getByRole("term")).toHaveText([
    "Books on Nov 3, 2026",
    "Cash count",
    "Difference",
  ]);
  await expectAccessible(page);

  // Record the difference…: the sheet, prefilled.
  await refusal.getByRole("button", { name: "Record the difference…" }).click();
  const sheet = page.getByRole("dialog", { name: "Record a Transaction" });
  await expect(sheet.getByRole("textbox", { name: "Amount (EUR)" })).toHaveValue("-2.50");
  await expect(sheet.getByRole("textbox", { name: "Date" })).toHaveValue("10/31/2026");
  await expect(sheet.getByRole("textbox", { name: "Description" })).toHaveValue(
    "Cash count difference",
  );
  await expect(sheet.getByRole("combobox", { name: "Other side" })).toHaveValue("");
  await sheet.getByRole("combobox", { name: "Other side" }).fill("Groceries");
  await page.getByRole("option", { name: "Food › Groceries", exact: true }).click();
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Recorded: Cash count difference, -€2.50")).toBeVisible();
  await expect(sheet).toBeHidden();
  // The refusal's numbers are out of date now: the month's own state shows instead.
  await expect(refusal).toBeHidden();
  await expect(page.getByText("Nothing stops October 2026 closing.")).toBeVisible();

  // Closed again, it passes, and November opens.
  await closeButton.click();
  await expect(toast(page, "October 2026 closed. November 2026 is open.")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "November 2026", exact: true }),
  ).toBeVisible();

  // The closed month: the day counted and the balance the count proved.
  await page.getByRole("link", { name: "Previous month: October 2026" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "October 2026", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("term")).toHaveText([
    "Counted on",
    "Balance at month end (proven by the count)",
    "Computed balance",
  ]);
  await expect(page.getByRole("definition")).toHaveText(["Nov 3, 2026", "€37.50", "€37.50"]);
  await expectAccessible(page);

  // Reopen, though November has a Transaction.
  await page.getByRole("button", { name: "Record a Transaction" }).click();
  await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill("-1");
  await sheet.getByRole("combobox", { name: "Other side" }).fill("Groceries");
  await page.getByRole("option", { name: "Food › Groceries", exact: true }).click();
  await sheet.getByRole("textbox", { name: "Description" }).fill("Coffee");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet).toBeHidden();

  await page.getByRole("button", { name: "Reopen October 2026" }).click();
  const confirm = page.getByRole("dialog", { name: "Reopen October 2026?" });
  await expect(confirm).toHaveAccessibleDescription(
    "November 2026 goes back to not open yet and October 2026 becomes editable again. You'll need to count again to close it.",
  );
  await expectAccessible(page);
  await confirm.getByRole("button", { name: "Reopen" }).click();
  await expect(toast(page, "October 2026 is open again.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Cash count (EUR)" })).toBeVisible();
});
