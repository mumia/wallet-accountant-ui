import { expect, test, type Page } from "@playwright/test";

// The real-stack smoke test (`make local-smoke`, smoke/smoke.sh): this UI's
// image on a fresh local cluster, with wallet-accountant and Zitadel. Everything
// goes through the UI, nothing is seeded through the API: sign in, redeem the
// bootstrap Invitation code, create a Household and a bank Account, give it a
// Connection with a CSV mapping, import a statement, Accept its rows, and close
// the month.
//
// Every date is relative to last month, so it passes on any day of the month.
// The browser and this file both work in UTC (playwright.config.ts).

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set; run the smoke test with make local-smoke`);
  }
  return value;
}

const base = env("WA_UI_BASE_URL");
const user = env("WA_UI_USER");
const password = env("WA_UI_PASSWORD");
const invitationCode = env("WA_INVITATION_CODE");

const now = new Date();
const dayOfLastMonth = (day: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day));
const lastMonth = dayOfLastMonth(1);
const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

const formatter = (options: Intl.DateTimeFormatOptions) => {
  const format = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
  return (date: Date) => format.format(date);
};
/** As the date input takes it: 10/01/2026. */
const usDate = formatter({ year: "numeric", month: "2-digit", day: "2-digit" });
/** As rows show it: Oct 2, 2026. */
const mediumDate = formatter({ dateStyle: "medium" });
/** October 1, 2026. */
const longDate = formatter({ dateStyle: "long" });
/** October 2026. */
const monthName = formatter({ month: "long", year: "numeric" });
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const euros = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(cents / 100);

const household = "Smoke home";
const account = "Smoke current account";
const connection = "Bank export";
const rows = [
  { day: 2, description: "Salary payment", cents: 250_000, category: "Salary" },
  { day: 10, description: "Supermarket", cents: -2_340, category: "Groceries" },
  { day: 20, description: "Coffee", cents: -350, category: "Groceries" },
].map((row) => ({ ...row, date: dayOfLastMonth(row.day) }));
const rowsTotal = rows.reduce((total, row) => total + row.cents, 0);
const exportBalance = 300_000;
const openingBalance = exportBalance - rowsTotal;

/**
 * The bank's export: commas, ISO dates and decimal points, with no quoting
 * (the mock reads no quotes, the backend does). Every row is in last month.
 */
const statementFile = {
  name: "statement.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    [
      "Date,Description,Amount,Reference",
      ...rows.map(
        (row, i) =>
          `${isoDate(row.date)},${row.description},${(row.cents / 100).toFixed(2)},SMOKE-${String(i + 1)}`,
      ),
    ].join("\n") + "\n",
  ),
};

/** "Oct 10, 2026, Supermarket, -€23.40", as the To review list names a row. */
const rowLabel = (row: (typeof rows)[number]) =>
  [mediumDate(row.date), row.description, euros(row.cents)].join(", ");

// The sidebar repeats some of what the page says, such as an Account's state.
const main = (page: Page) => page.getByRole("main");
const select = (page: Page, name: string) => page.getByRole("combobox", { name, exact: true });
const stat = (page: Page, term: string) =>
  page
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");

/** Zitadel's v1 login: login name, then password; its optional prompts are skipped. */
async function signInAtZitadel(page: Page) {
  const config = (await (await page.request.get(`${base}/config.json`)).json()) as {
    oidc: { issuer: string };
  };
  const issuer = new URL(config.oidc.issuer);
  await page.waitForURL((url) => url.host === issuer.host);
  await page.locator("#loginName").fill(user);
  await page.locator("#submit-button").click();
  await page.locator("#password").fill(password);
  await page.locator("#submit-button").click();
  const skip = page.getByRole("button", { name: "Skip" });
  const left = page.waitForURL((url) => url.host !== issuer.host);
  await Promise.race([left, skip.waitFor()]);
  if (new URL(page.url()).host === issuer.host) {
    await skip.click();
  }
  await left;
}

async function pickColumn(page: Page, number: number, field: string) {
  await page
    .getByRole("button", { name: new RegExp(`^What column ${String(number)} holds`) })
    .click();
  await page.getByRole("menuitemradio", { name: field, exact: true }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

async function createCategory(page: Page, kind: "Expense" | "Income", name: string) {
  await page
    .getByRole("region", { name: kind })
    .getByRole("button", { name: "New Category" })
    .click();
  const dialog = page.getByRole("dialog", { name: `New ${kind} Category` });
  await dialog.getByRole("textbox", { name: "Name" }).fill(name);
  await dialog.getByRole("button", { name: "Create Category" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: kind })).toContainText(name);
}

test("a new User signs in, imports a statement and closes last month", async ({ page }) => {
  await test.step("sign in, redeem the bootstrap code and create a Household", async () => {
    await page.goto(`${base}/`);
    await signInAtZitadel(page);

    await expect(page).toHaveURL(`${base}/register`);
    await page.getByRole("textbox", { name: "Invitation code" }).fill(invitationCode);
    await page.getByRole("textbox", { name: "Display name" }).fill("Smoke tester");
    await page.getByRole("button", { name: "Redeem" }).click();

    await expect(page).toHaveURL(`${base}/households/new`);
    await page.getByRole("textbox", { name: "Name" }).fill(household);
    await page.getByRole("combobox", { name: "Base currency" }).fill("eur");
    await page.getByRole("option", { name: "EUR — Euro" }).click();
    await page.getByRole("button", { name: "Create Household" }).click();

    await expect(page).toHaveURL(/\/households\/[0-9a-f-]{36}$/);
    await expect(main(page).getByText("Add your first Account.")).toBeVisible();
  });

  await test.step("add a bank Account starting on the 1st of last month", async () => {
    await page.getByRole("main").getByRole("button", { name: "Add Account" }).click();
    const dialog = page.getByRole("dialog", { name: "Add Account" });
    await dialog.getByRole("textbox", { name: "Name" }).fill(account);
    await expect(dialog.getByRole("radio", { name: "Bank account" })).toBeChecked();
    await expect(dialog.getByRole("combobox", { name: "Account currency" })).toHaveValue(
      "EUR — Euro",
    );
    await dialog.getByRole("textbox", { name: "Start date" }).fill(usDate(lastMonth));
    await dialog.getByRole("button", { name: "Add Account" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: account })).toBeVisible();
    await expect(
      main(page).getByText("Bank account · EUR · Awaiting first Statement import"),
    ).toBeVisible();
  });

  await test.step("create a Connection with a CSV mapping from the statement", async () => {
    await page.getByRole("link", { name: "Create a Connection" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill(connection);
    await page.getByLabel("Open a sample file").setInputFiles(statementFile);

    await expect(select(page, "Encoding")).toHaveValue("UTF_8");
    await expect(select(page, "Delimiter")).toHaveValue(",");
    await expect(
      page.getByRole("checkbox", { name: "The first line names the columns" }),
    ).toBeChecked();
    await expect(select(page, "Date format")).toHaveValue("YYYY-MM-DD");
    await expect(select(page, "Decimal separator")).toHaveValue(".");
    await pickColumn(page, 1, "Booking date");
    await pickColumn(page, 2, "Description");
    await pickColumn(page, 3, "Amount");
    await pickColumn(page, 4, "Bank transaction ID");

    // The backend reads the sample with the mapping.
    await page.getByRole("button", { name: "Read the sample" }).click();
    await expect(main(page).getByText("3 rows read · The first 3:")).toBeVisible();
    const read = page.getByRole("table", { name: "The first rows as they will read" });
    await expect(read.getByRole("row").nth(2)).toContainText(euros(rows[1]?.cents ?? 0));

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(`Connection created: ${connection}.`)).toBeVisible();
  });

  await test.step("import the statement, which sets the Opening balance", async () => {
    await page.getByRole("link", { name: "Import the first statement" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Import the first statement");
    await page.getByLabel("Choose a file", { exact: true }).setInputFiles(statementFile);
    const balance = (exportBalance / 100).toFixed(2);
    await page.getByRole("textbox", { name: "Export balance (EUR)", exact: true }).fill(balance);
    await page.getByRole("textbox", { name: "Export balance, again (EUR)" }).fill(balance);
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(main(page).getByText(`Opening balance on ${longDate(lastMonth)}`)).toBeVisible();
    await expect(main(page).getByText(euros(openingBalance), { exact: true })).toBeVisible();
    await expect(
      main(page).getByText(
        `= Export balance ${euros(exportBalance)} − rows total ${euros(rowsTotal)}`,
      ),
    ).toBeVisible();
    await expect(stat(page, "Rows to import")).toHaveText(String(rows.length));

    await page.getByRole("button", { name: "Confirm and import" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "Statement imported" })).toBeVisible();
    await expect(main(page).getByText("Balance check: Passed")).toBeVisible();
    await expect(stat(page, "Imported")).toHaveText(String(rows.length));
    await expect(stat(page, "Opening balance recorded")).toHaveText(euros(openingBalance));
  });

  await test.step("create Categories: a new Household has none to pick", async () => {
    await page
      .getByRole("navigation", { name: "Household" })
      .getByRole("link", { name: "Categories" })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Categories" })).toBeVisible();
    await createCategory(page, "Expense", "Groceries");
    await createCategory(page, "Income", "Salary");
  });

  await test.step("Accept every row To review with a Category", async () => {
    await page
      .getByRole("navigation", { name: "Household" })
      .getByRole("link", { name: account })
      .click();
    await page
      .getByRole("navigation", { name: "Account" })
      .getByRole("link", { name: "To review" })
      .click();

    for (const row of rows) {
      const label = rowLabel(row);
      await page.getByRole("combobox", { name: `Category for ${label}` }).fill(row.category);
      await page.getByRole("option", { name: row.category, exact: true }).click();
      await page.getByRole("button", { name: `Accept ${label}` }).click();
      await expect(page.getByRole("button", { name: `Accept ${label}` })).toHaveCount(0);
    }
  });

  await test.step("close last month with the Export balance; the open month moves on", async () => {
    const closing = monthName(lastMonth);
    const opening = monthName(thisMonth);
    await page
      .getByRole("navigation", { name: "Account" })
      .getByRole("link", { name: "Months" })
      .click();
    await page.getByRole("link", { name: closing, exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: closing })).toBeVisible();
    await expect(main(page).getByText(`Nothing stops ${closing} closing.`)).toBeVisible();

    await page
      .getByRole("textbox", { name: "Statement balance (EUR)" })
      .fill((exportBalance / 100).toFixed(2));
    await expect(
      main(page).getByText(`Computed balance ${euros(exportBalance)} · Difference ${euros(0)}`),
    ).toBeVisible();
    await page.getByRole("button", { name: `Close ${closing}` }).click();

    await expect(page).toHaveURL(new RegExp(`/months/${isoDate(thisMonth).slice(0, 7)}$`));
    await expect(page.getByText(`${closing} closed. ${opening} is open.`)).toBeVisible();
  });
});
