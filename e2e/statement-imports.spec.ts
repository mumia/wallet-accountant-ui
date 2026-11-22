import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The default mock scenario (src/mocks/db.ts). Main's imports, all through
// Connection 1, newest first: 2026-11-21 (Balance check waiting, two rows
// Accepted on 2026-11-14), 2026-11-20 (failed, voided), 2026-10-15, and its
// first of 2026-01-03. Its open month is November 2026. Credit card (start
// date 2026-11-01) awaits its first import.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;
const creditCard = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000102`;
const latestImport = "0190f5f2-7c00-7000-8000-000000000401";

const bodyRows = (page: Page) => page.locator("tbody tr");
const row = (page: Page, text: string | RegExp) => bodyRows(page).filter({ hasText: text });
const voidButton = (page: Page, date: string) =>
  page.getByRole("button", { name: `Void the import of ${date}` });
const toast = (page: Page, text: string) => page.getByRole("dialog").filter({ hasText: text });

test("every import is listed newest first; a blocked Void says why, and Void works once fixed", async ({
  page,
}) => {
  await page.goto(`${main}/statement-imports`);

  await expect(bodyRows(page)).toHaveCount(4);
  await expect(bodyRows(page).nth(0)).toContainText("Nov 21, 2026");
  await expect(bodyRows(page).nth(1)).toContainText("Nov 20, 2026Voided on Nov 20, 2026");
  await expect(bodyRows(page).nth(2)).toContainText("Oct 15, 2026");
  await expect(bodyRows(page).nth(3)).toContainText("Jan 3, 2026");
  await expect(bodyRows(page).nth(0)).toContainText("Connection 1€1,234.50");
  await expect(bodyRows(page).nth(0)).toContainText("9 imported · 0 skipped · 1 suspected");
  await expect(bodyRows(page).nth(3)).toContainText("Opening balance €2,500.00");

  // A voided import: no Void, and its failed check needs nothing more.
  const voided = row(page, "Voided on");
  await expect(voided.getByRole("button")).toHaveCount(0);
  await expect(voided).toContainText("Failed");
  await expect(voided).not.toContainText("Void it and import a corrected file.");

  // The latest has Accepted rows; the first is not the latest and touches a closed month.
  await expect(voidButton(page, "Nov 21, 2026")).toBeDisabled();
  await expect(voidButton(page, "Nov 21, 2026")).toHaveAccessibleDescription(
    "Some of its rows are Accepted. Reverse them in Transactions",
  );
  await expect(voidButton(page, "Jan 3, 2026")).toBeDisabled();
  await expect(bodyRows(page).nth(3)).toContainText(
    "Only the latest import can be voided.It has rows in a closed month.Reopen October 2026",
  );
  await expect(
    row(page, "Jan 3, 2026").getByRole("link", { name: "Reopen October 2026" }),
  ).toHaveAttribute("href", `${main}/months/2026-10`);
  await expectAccessible(page);

  // Reversing the Accepted rows unblocks it.
  await page.getByRole("link", { name: "Reverse them in Transactions" }).click();
  await expect(page).toHaveURL(`${main}/transactions?booking_month=2026-11`);
  for (const accepted of ["Nov 14, 2026, Albert Heijn, -€23.40", "Nov 14, 2026, Shell, -€38.50"]) {
    await page.getByRole("button", { name: `Actions for ${accepted}` }).click();
    await page.getByRole("menuitem", { name: "Reverse…" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reverse" }).click();
    await expect(page.getByRole("button", { name: `Actions for ${accepted}` })).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Statement imports" }).click();

  await expect(voidButton(page, "Nov 21, 2026")).toBeEnabled();
  await voidButton(page, "Nov 21, 2026").click();
  const dialog = page.getByRole("dialog", { name: "Void the import of Nov 21, 2026 (9 rows)?" });
  await expect(dialog).toHaveAccessibleDescription(
    "Its Imported transactions become Discarded and the file can be imported again.",
  );
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Void" }).click();

  await expect(toast(page, "Statement import voided.")).toBeVisible();
  await expect(bodyRows(page).nth(0)).toContainText("Nov 21, 2026Voided on");
  await expect(bodyRows(page).nth(0).getByRole("button")).toHaveCount(0);
  // October's is the latest now, with nothing in the way.
  await expect(voidButton(page, "Oct 15, 2026")).toBeEnabled();
  await expectAccessible(page);

  await toast(page, "Statement import voided.")
    .getByRole("button", { name: "Import statement" })
    .click();
  await expect(page).toHaveURL(`${main}/statement-imports/new`);
});

test("voiding the first import reverses the Opening balance; a refusal stays in the dialog", async ({
  page,
}) => {
  await page.goto(`${creditCard}/statement-imports`);
  await expect(page.getByText("No Statement imports yet.", { exact: false })).toBeVisible();
  await expectAccessible(page);

  // The first import, as the flow records it.
  await page.goto(`${creditCard}/statement-imports/new`);
  await page.getByLabel("Choose a file").setInputFiles({
    name: "november.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      ["Date;Description;Amount;Id", "2026-11-03;Albert Heijn;-23.40;CC-2"].join("\n"),
    ),
  });
  await page.getByRole("textbox", { name: "Export balance (EUR)", exact: true }).fill("500");
  await page.getByRole("textbox", { name: "Export balance, again (EUR)" }).fill("500");
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Confirm and import" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Statement imported" })).toBeVisible();

  // The Void and its two retries fail.
  await page.goto(`${creditCard}/statement-imports?mock-fail=POST:3`);
  await expect(bodyRows(page)).toHaveCount(1);
  await expect(bodyRows(page)).toContainText("Opening balance €523.40");
  const date = (await bodyRows(page).locator("td").first().textContent()) ?? "";
  await voidButton(page, date).click();
  const dialog = page.getByRole("dialog", { name: `Void the import of ${date} (1 row)?` });
  await expect(dialog).toHaveAccessibleDescription(
    "Its Imported transactions become Discarded and the file can be imported again. It's this Account's first import, so its Opening balance is reversed too and the Account will await its first Statement import again.",
  );
  await dialog.getByRole("button", { name: "Void" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Void" }).click();
  await expect(toast(page, "Statement import voided.")).toBeVisible();
  await expect(bodyRows(page)).toContainText("Voided on");
  await expect(page.getByRole("main")).toContainText(
    "Credit card · EUR · Awaiting first Statement import",
  );

  await toast(page, "Statement import voided.")
    .getByRole("button", { name: "Import statement" })
    .click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Import the first statement" }),
  ).toBeVisible();
});

test("a month's unchecked import links to it, highlighted", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
  await page.goto(`${main}/months/2026-11`);
  await page.getByRole("link", { name: "A Statement import's Balance check is waiting" }).click();

  await expect(page).toHaveURL(`${main}/statement-imports?statement_import_id=${latestImport}`);
  const highlighted = row(page, "Nov 21, 2026");
  await expect(highlighted).toHaveAttribute("aria-current", "true");
  await expect(highlighted).toBeFocused();
  await expect(page.locator("tbody tr[aria-current]")).toHaveCount(1);
  await expectAccessible(page);
});
