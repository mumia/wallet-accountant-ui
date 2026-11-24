import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./axe";

// The default mock scenario (src/mocks/db.ts). Main has "ING export" (a
// mapping for `Date;Description;Amount;Id` with a header row, and Statement
// imports) and "Old export" (no mapping). The mock's Connections follow the
// backend's rules (src/mocks/connection-handlers.ts).
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const main = `${home}/accounts/0190f5f2-7c00-7000-8000-000000000101`;
const ingExport = "0190f5f2-7c00-7000-8000-000000000202";
const oldExport = "0190f5f2-7c00-7000-8000-000000000203";

/** A Dutch bank's export: semicolons, day-first dates, decimal commas, thousands points. */
const dutchSample = {
  name: "rekening.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    [
      "Datum;Omschrijving;Tegenrekening;Bedrag;Referentie",
      "31-10-2026;Albert Heijn;NL01;-23,40;R-1",
      "01-11-2026;Salaris;NL02;2.500,00;R-2",
      "02-11-2026;Koffie;NL03;-3,50;R-3",
    ].join("\n"),
  ),
};

/** Excel's "Unicode Text" export: UTF-16, little-endian, after a byte order mark. */
const unicodeTextSample = {
  name: "unicode.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    "\ufeff" +
      ["Date;Description;Amount", "16-11-2026;Café Procès;-76,28", "17-11-2026;Transfer;-100,00"]
        .join("\n")
        .concat("\n"),
    "utf16le",
  ),
};

const select = (page: Page, name: string) => page.getByRole("combobox", { name, exact: true });

async function pickColumn(page: Page, number: number, field: string) {
  await page
    .getByRole("button", { name: new RegExp(`^What column ${String(number)} holds`) })
    .click();
  await page.getByRole("menuitemradio", { name: field, exact: true }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

test("the Connections tab lists each Connection by name, with Import statement", async ({
  page,
}) => {
  await page.goto(`${main}/connections`);

  const rows = page.getByRole("table").getByRole("row");
  await expect(rows).toHaveText([/Name/, /ING export/, /Old export/]);
  await expect(rows.nth(2)).toContainText("Needs a CSV mapping");
  // Without a mapping there is nothing to import through.
  await expect(page.getByRole("link", { name: "Import statement through Old export" })).toHaveCount(
    0,
  );
  await expectAccessible(page);

  await page.getByRole("link", { name: "Import statement through ING export" }).click();
  await expect(page).toHaveURL(`${main}/statement-imports/new?connection_id=${ingExport}`);
  await expect(page.getByText("Through ING export · Change")).toBeVisible();
});

test("creates a Connection from a sample file, picking columns by clicking", async ({ page }) => {
  await page.goto(`${main}/connections`);
  await page.getByRole("link", { name: "New Connection" }).click();

  await expect(page).toHaveURL(`${main}/connections/new`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("New Connection");
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Statement file");
  await expect(page.getByText("Open a sample file to see how its rows will read.")).toBeVisible();
  await expectAccessible(page);

  // The browser guesses the encoding, delimiter, header row, date format and decimal separator.
  await page.getByLabel("Open a sample file").setInputFiles(dutchSample);
  await expect(
    page.getByText("Settings guessed from rekening.csv. Check them, then pick each column."),
  ).toBeVisible();
  await expect(select(page, "Encoding")).toHaveValue("UTF_8");
  await expect(select(page, "Delimiter")).toHaveValue(";");
  await expect(
    page.getByRole("checkbox", { name: "The first line names the columns" }),
  ).toBeChecked();
  await expect(select(page, "Date format")).toHaveValue("DD-MM-YYYY");
  await expect(select(page, "Decimal separator")).toHaveValue(",");

  const sample = page.getByRole("table", { name: /The first rows of rekening\.csv/ });
  await expect(sample.getByRole("row")).toHaveCount(4);
  await pickColumn(page, 1, "Booking date");
  await pickColumn(page, 2, "Description");
  await pickColumn(page, 3, "Payee");
  await pickColumn(page, 4, "Amount");
  await pickColumn(page, 5, "Bank transaction ID");
  await expect(select(page, "Booking date")).toHaveValue("h:Datum");
  await expect(select(page, "Amount")).toHaveValue("h:Bedrag");
  await expect(select(page, "Payee (optional)")).toHaveValue("h:Tegenrekening");
  await expectAccessible(page);

  // The backend reads the sample: the thousands point isn't set yet.
  await page.getByRole("button", { name: "Read the sample" }).click();
  await expect(page.getByText("2 rows read · The first 2:")).toBeVisible();
  const unreadable = page.getByRole("alert").filter({ hasText: "1 line can't be read" });
  await expect(unreadable.getByRole("row").nth(1)).toHaveText(
    '3the amount "2.500,00" is not a number',
  );
  await expectAccessible(page);

  await select(page, "Thousands separator").selectOption(".");
  await expect(
    page.getByText("The mapping has changed since. Read the sample again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Read the sample" }).click();
  await expect(page.getByText("3 rows read · The first 3:")).toBeVisible();
  const read = page.getByRole("table", { name: "The first rows as they will read" });
  await expect(read.getByRole("row")).toHaveText([
    "LineBooking dateDescriptionPayeeBank transaction IDAmount",
    "2Oct 31, 2026Albert HeijnNL01R-1-€23.40",
    "3Nov 1, 2026SalarisNL02R-2€2,500.00",
    "4Nov 2, 2026KoffieNL03R-3-€3.50",
  ]);
  await expect(page.getByText("The mapping has changed since")).toHaveCount(0);

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(`${main}/connections`);
  await expect(page.getByRole("table").getByRole("row")).toHaveText([
    /Name/,
    /ING export/,
    /Old export/,
    /Statement file/,
  ]);

  // It reads back as saved; without Statement imports there is no note.
  await page.getByRole("link", { name: "Edit Statement file" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Edit Statement file");
  await expect(select(page, "Date format")).toHaveValue("DD-MM-YYYY");
  await expect(select(page, "Thousands separator")).toHaveValue(".");
  await expect(select(page, "Booking date")).toHaveValue("h:Datum");
  await expect(page.getByText("Changes apply to future imports")).toHaveCount(0);
});

test("a UTF-16 sample is guessed as UTF-16 and reads", async ({ page }) => {
  await page.goto(`${main}/connections/new`);

  await page.getByLabel("Open a sample file").setInputFiles(unicodeTextSample);
  await expect(select(page, "Encoding")).toHaveValue("UTF_16");
  await expect(select(page, "Delimiter")).toHaveValue(";");
  const sample = page.getByRole("table", { name: /The first rows of unicode\.csv/ });
  await expect(sample.getByRole("row").nth(1)).toContainText("Café Procès");

  await pickColumn(page, 1, "Booking date");
  await pickColumn(page, 2, "Description");
  await pickColumn(page, 3, "Amount");
  await page.getByRole("button", { name: "Read the sample" }).click();
  const read = page.getByRole("table", { name: "The first rows as they will read" });
  await expect(read.getByRole("row")).toHaveText([
    "LineBooking dateDescriptionAmount",
    "2Nov 16, 2026Café Procès-€76.28",
    "3Nov 17, 2026Transfer-€100.00",
  ]);
  await expectAccessible(page);

  // Read as UTF-8, the backend refuses the file and says what to choose.
  await select(page, "Encoding").selectOption("UTF_8");
  await page.getByRole("button", { name: "Read the sample" }).click();
  const unreadable = page.getByRole("alert").filter({ hasText: "1 line can't be read" });
  await expect(unreadable).toContainText(
    "the file starts with a UTF-16 byte order mark; set the mapping's encoding to UTF-16",
  );
});
test("mapping rules show on their fields before Save", async ({ page }) => {
  await page.goto(`${main}/connections/new`);
  const save = page.getByRole("button", { name: "Save" });

  await save.click();
  await expect(select(page, "Date format")).toBeFocused();
  await expect(select(page, "Date format")).toHaveAccessibleDescription("Choose the date format");
  await expect(select(page, "Booking date")).toHaveAccessibleDescription("Choose the column");
  await expect(select(page, "Description")).toHaveAccessibleDescription("Choose the column");
  await expect(select(page, "Amount")).toHaveAccessibleDescription("Choose the column");
  await expectAccessible(page);

  await page.getByRole("textbox", { name: "Name" }).fill("   ");
  await select(page, "Thousands separator").selectOption(".");
  await select(page, "Booking date").selectOption("Column 1");
  await select(page, "Description").selectOption("Column 1");
  await save.click();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveAccessibleDescription(
    "Give the Connection a name",
  );
  await expect(select(page, "Thousands separator")).toHaveAccessibleDescription(
    "Choose a thousands separator other than the decimal separator",
  );
  await expect(select(page, "Booking date")).not.toHaveAttribute("aria-invalid", "true");
  await expect(select(page, "Description")).toHaveAccessibleDescription(
    "This column is already used for Booking date",
  );

  // Debit and credit replace the amount.
  await select(page, "Amount columns").selectOption("Separate debit and credit columns");
  await expect(select(page, "Amount")).toHaveCount(0);
  await expect(select(page, "A positive amount is")).toHaveCount(0);
  await save.click();
  await expect(select(page, "Debit (money out)")).toHaveAccessibleDescription("Choose the column");
  await expect(select(page, "Credit (money in)")).toHaveAccessibleDescription("Choose the column");
});

test("leaving with unsaved changes asks first", async ({ page }) => {
  await page.goto(`${main}/connections/new`);
  await page.getByRole("textbox", { name: "Name" }).fill("Card export");

  await page.getByRole("button", { name: "Cancel" }).click();
  const dialog = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(dialog).toContainText("Your changes to this Connection will be lost.");
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Stay" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Card export");

  await page.getByRole("link", { name: "Transactions" }).click();
  await dialog.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(new RegExp(`${main}/transactions`));
});

test("a server refusal is the form alert, keeping the input", async ({ page }) => {
  await page.goto(`${main}/connections/new`);
  const name = page.getByRole("textbox", { name: "Name" });

  // Without a sample, columns are picked by position.
  await name.fill("ing EXPORT");
  await select(page, "Date format").selectOption("YYYY-MM-DD");
  await select(page, "Booking date").selectOption("Column 1");
  await select(page, "Description").selectOption("Column 2");
  await select(page, "Amount").selectOption("Column 3");
  await page.getByRole("button", { name: "Save" }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Connection name taken" });
  await expect(alert).toContainText('This Account already has a Connection named "ing EXPORT".');
  await expect(name).toHaveValue("ing EXPORT");
  await expectAccessible(page);

  await name.fill("Second export");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(`${main}/connections`);
  await expect(page.getByRole("table")).toContainText("Second export");
});

test("edits an existing Connection: a rename alone leaves the mapping alone", async ({ page }) => {
  const mappingWrites: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/csv-mapping")) {
      mappingWrites.push(request.method());
    }
  });
  await page.goto(`${main}/connections`);
  await page.getByRole("link", { name: "Edit ING export" }).click();

  await expect(page).toHaveURL(`${main}/connections/${ingExport}`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Edit ING export");
  await expect(select(page, "Booking date")).toHaveValue("h:Date");
  await expect(select(page, "Bank transaction ID (optional)")).toHaveValue("h:Id");
  await expect(
    page.getByText(
      "Changes apply to future imports. To re-read a file already imported, Void its Statement import and import it again.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Statement imports" })).toHaveAttribute(
    "href",
    `${main}/statement-imports`,
  );
  await expectAccessible(page);

  await page.getByRole("textbox", { name: "Name" }).fill("ING current");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(`${main}/connections`);
  await expect(page.getByRole("table")).toContainText("ING current");
  expect(mappingWrites).toEqual([]);
});

test("a Connection given its mapping from the import flow returns there", async ({ page }) => {
  await page.goto(`${main}/statement-imports/new`);
  await page.getByRole("link", { name: "Edit Old export" }).click();

  await expect(page).toHaveURL(`${main}/connections/${oldExport}?from=statement-import`);
  // A file without a header row: columns by position.
  await page.getByRole("checkbox", { name: "The first line names the columns" }).click();
  await select(page, "Date format").selectOption("DD/MM/YYYY");
  await select(page, "Booking date").selectOption("Column 1");
  await select(page, "Description").selectOption("Column 2");
  await select(page, "Amount").selectOption("Column 3");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(`${main}/statement-imports/new?connection_id=${oldExport}`);
  await expect(page.getByText("Through Old export · Change")).toBeVisible();
});
