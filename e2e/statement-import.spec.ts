import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The default mock scenario (src/mocks/db.ts). Credit card (start date
// 2026-11-01) awaits its first import and has one Connection. Main has two:
// Connection 1, which its latest import (Export balance 1,234.50 EUR) came
// through, with rows NL-1114-01 (Albert Heijn, -23.40) and NL-1114-02 (Shell,
// -38.50) on 2026-11-14; and Connection 2, without a CSV mapping.
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;
const creditCard = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000102`;
const mainConnection = "0190f5f2-7c00-7000-8000-000000000202";

/** A statement file in the mock bank's layout (`Date;Description;Amount;Id`). */
function statement(name: string, rows: string[]) {
  return {
    name,
    mimeType: "text/csv",
    buffer: Buffer.from(["Date;Description;Amount;Id", ...rows].join("\n")),
  };
}

const exportBalance = (page: Page) =>
  page.getByRole("textbox", { name: "Export balance (EUR)", exact: true });
const confirmation = (page: Page) =>
  page.getByRole("textbox", { name: "Export balance, again (EUR)" });
const steps = (page: Page) => page.getByRole("list", { name: "Steps" });
const stat = (page: Page, term: string) =>
  page
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");

async function chooseFile(page: Page, file: ReturnType<typeof statement>) {
  await page.getByLabel(/^(Choose a file|Replace file)$/).setInputFiles(file);
}

test("a first import previews the Opening balance, then records it", async ({ page }) => {
  await page.goto(creditCard);
  await page.getByRole("link", { name: "Import the first statement" }).click();

  // One Connection: no step to choose it.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Import the first statement");
  await expect(steps(page).getByRole("listitem")).toHaveText([
    "1File and Export balance",
    "2Opening balance",
    "3Result",
  ]);
  await expect(page.getByText("Through Connection 1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Change" })).toHaveCount(0);
  await expect(exportBalance(page)).toHaveAccessibleDescription(
    "Your bank's booked balance when you exported this file, in EUR. Leave out card payments still marked as pending.",
  );
  await expectAccessible(page);

  // Nothing chosen or typed.
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Choose the statement file")).toBeVisible();
  await expect(page.getByText("Type the Export balance", { exact: true })).toBeVisible();
  await expect(page.getByText("Type the Export balance again")).toBeVisible();
  await expectAccessible(page);

  // A zero-byte file is refused in the browser.
  await chooseFile(page, { name: "empty.csv", mimeType: "text/csv", buffer: Buffer.from("") });
  await expect(page.getByText("This file is empty.", { exact: false })).toBeVisible();

  await chooseFile(
    page,
    statement("november.csv", [
      "2026-10-30;Bakery;-5.00;CC-1",
      "2026-11-03;Albert Heijn;-23.40;CC-2",
      "2026-11-05;Refund;100.00;CC-3",
    ]),
  );
  await expect(page.getByText(/^november\.csv, \d+ byte/)).toBeVisible();
  await expect(page.getByLabel("Replace file")).toBeAttached();

  // The second entry is checked when it's left, never while typing.
  await exportBalance(page).fill("500");
  await confirmation(page).fill("50");
  await expect(page.getByText("The two Export balances differ")).toHaveCount(0);
  await confirmation(page).blur();
  await expect(confirmation(page)).toHaveAccessibleDescription(
    "Type it again rather than pasting it: on the first import it sets the Opening balance. The two Export balances differ",
  );
  await expectAccessible(page);
  await confirmation(page).fill("500");
  await page.getByRole("button", { name: "Preview" }).click();

  await expect(
    page.getByRole("heading", { level: 3, name: "Check the Opening balance" }),
  ).toBeVisible();
  await expect(page.getByText("Opening balance on November 1, 2026")).toBeVisible();
  await expect(page.getByText("€423.40", { exact: true })).toBeVisible();
  await expect(page.getByText("= Export balance €500.00 − rows total €76.60")).toBeVisible();
  await expect(stat(page, "Rows to import")).toHaveText("2");
  await expect(stat(page, "Ignored, before the start date")).toHaveText("1");
  await expect(stat(page, "File")).toHaveText("november.csv");
  await expect(stat(page, "Connection")).toHaveText("Connection 1");
  await expect(
    page.getByText(
      "1 row is before the Account's start date of November 1, 2026, so it isn't imported.",
    ),
  ).toBeVisible();
  await expectAccessible(page);

  // Back keeps the file and both balances.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText(/^november\.csv/)).toBeVisible();
  await expect(exportBalance(page)).toHaveValue("500.00");
  await expect(confirmation(page)).toHaveValue("500.00");
  await page.getByRole("button", { name: "Preview" }).click();

  await page.getByRole("button", { name: "Confirm and import" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Statement imported" })).toBeVisible();
  await expect(page.getByText("Balance check: Passed")).toBeVisible();
  await expect(stat(page, "Imported")).toHaveText("2");
  await expect(stat(page, "Opening balance recorded")).toHaveText("€423.40");
  await expect(steps(page).getByRole("listitem")).toHaveText([
    "File and Export balance (done)",
    "Opening balance (done)",
    "3Result",
  ]);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Review 2 rows" }).click();
  await expect(page).toHaveURL(`${creditCard}/to-review`);
  // The Account read was refetched: it no longer awaits its first import.
  await expect(page.getByRole("main")).toContainText("Credit card · EUR · €500.00");
});

test("a later import chooses the Connection and reports repeats and Suspected duplicates", async ({
  page,
}) => {
  await page.goto(`${main}/statement-imports/new`);

  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Import statement");
  await expect(steps(page).getByRole("listitem")).toHaveText([
    "1Connection",
    "2File and Export balance",
    "3Result",
  ]);
  // The latest import's Connection is preselected; one without a mapping can't be picked.
  await expect(page.getByRole("radio", { name: /Connection 1/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Connection 2/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Connection 2/ })).toHaveAccessibleName(
    /Needs a CSV mapping/,
  );
  await expect(page.getByRole("link", { name: "Edit Connection 2" })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Through Connection 1")).toBeVisible();
  await expect(confirmation(page)).toHaveCount(0);
  await chooseFile(
    page,
    statement("week-47.csv", [
      // The same bank transaction ID, Booking date and amount: a certain repeat.
      "2026-11-14;Albert Heijn;-23.40;NL-1114-01",
      // The same Booking date and amount as Shell, another ID: a Suspected duplicate.
      "2026-11-14;Shell Express;-38.50;NL-1114-09",
      "2026-11-16;Jumbo;-10.00;NL-1116-01",
      // Main's October is closed: ignored.
      "2026-10-30;Jumbo;-7.00;NL-1030-01",
    ]),
  );
  await exportBalance(page).fill("1000");
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByRole("heading", { level: 3, name: "Statement imported" })).toBeVisible();
  await expect(
    page.getByText(
      "Balance check: Waiting — decide the Suspected duplicates to finish the Balance check",
    ),
  ).toBeVisible();
  await expect(stat(page, "Imported")).toHaveText("2");
  await expect(stat(page, "Skipped as certain repeats")).toHaveText("1");
  await expect(stat(page, "Suspected duplicates")).toHaveText("1");
  await expect(stat(page, "Ignored, in closed months")).toHaveText("1");
  await expect(stat(page, "Opening balance recorded")).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Review 2 rows" }).click();
  await expect(page).toHaveURL(`${main}/to-review?state=SUSPECTED_DUPLICATE`);
});

test("a deep link skips choosing the Connection, and Change brings it back", async ({ page }) => {
  await page.goto(`${main}/statement-imports/new?connection_id=${mainConnection}`);

  await expect(steps(page).getByRole("listitem")).toHaveText([
    "1File and Export balance",
    "2Result",
  ]);
  await expect(page.getByText("Through Connection 1 · Change")).toBeVisible();
  await page.getByRole("link", { name: "Change" }).click();

  await expect(page).toHaveURL(`${main}/statement-imports/new`);
  await expect(page.getByRole("radio", { name: /Connection 1/ })).toBeChecked();
});

test("each refusal shows in the shape that fits it, keeping the input", async ({ page }) => {
  await page.goto(`${main}/statement-imports/new?connection_id=${mainConnection}`);
  const alert = page.getByRole("alert");
  const importButton = page.getByRole("button", { name: "Import" });

  // Unreadable lines: a table of them, and the way to the mapping.
  await chooseFile(
    page,
    statement("broken.csv", ["2026-11-20;Jumbo;-10.00;A", "20/11/2026;Jumbo;ten;B"]),
  );
  await exportBalance(page).fill("1224.50");
  await importButton.click();
  await expect(alert.getByText("Unreadable statement file")).toBeVisible();
  await expect(alert.getByRole("table", { name: "Lines that can't be read" })).toBeVisible();
  await expect(alert.getByRole("row")).toHaveText([
    "LineReason",
    '3the Booking date "20/11/2026" is not a date in the format YYYY-MM-DD; the amount "ten" is not a number',
  ]);
  await expect(
    alert.getByRole("link", { name: "Edit the Connection's CSV mapping" }),
  ).toHaveAttribute("href", `${main}/connections/${mainConnection}`);
  await expectAccessible(page);

  // A failed Balance check: the three amounts and what likely went wrong.
  const november = statement("november-20.csv", ["2026-11-20;Jumbo;-10.00;NL-1120-01"]);
  await chooseFile(page, november);
  await exportBalance(page).fill("9999");
  await importButton.click();
  await expect(alert.getByText("Balance check failed")).toBeVisible();
  await expect(alert.getByRole("definition")).toHaveText(["€1,224.50", "€9,999.00", "€8,774.50"]);
  await expect(alert.getByText(/^Likely causes: the Export balance was mistyped/)).toBeVisible();
  await expect(alert.getByRole("link", { name: "See the Statement imports" })).toBeVisible();
  await expectAccessible(page);

  // The file stays; the right Export balance imports it.
  await expect(page.getByText(/^november-20\.csv/)).toBeVisible();
  await exportBalance(page).fill("1224.50");
  await importButton.click();
  await expect(page.getByText("Balance check: Passed")).toBeVisible();

  // The same file again: a link to the import that has it.
  await page.goto(`${main}/statement-imports/new?connection_id=${mainConnection}`);
  await chooseFile(page, november);
  await exportBalance(page).fill("1214.50");
  await importButton.click();
  await expect(alert.getByText("Statement file already imported")).toBeVisible();
  await expectAccessible(page);
  await alert.getByRole("link", { name: "See the earlier import" }).click();
  await expect(page).toHaveURL(/\/statement-imports\?statement_import_id=[0-9a-f-]{36}$/);

  // Anything else: the problem's title and detail.
  await page.goto(`${main}/statement-imports/new?connection_id=${mainConnection}`);
  await chooseFile(page, statement("header-only.csv", []));
  await exportBalance(page).fill("1214.50");
  await importButton.click();
  await expect(alert).toHaveText(/Empty statement file\s*The statement file has no rows\./);
  await expectAccessible(page);
});

test("without a Connection, the flow says to create one", async ({ page }) => {
  await page.goto(home);
  await page.getByRole("main").getByRole("button", { name: "Add Account" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Account" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Savings");
  await dialog.getByRole("button", { name: "Add Account" }).click();
  await page.getByRole("link", { name: "Import statement" }).click();

  await expect(
    page.getByRole("heading", { name: "This Account has no Connection yet" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a Connection" })).toHaveAttribute(
    "href",
    /\/connections\/new$/,
  );
  await expectAccessible(page);
});
