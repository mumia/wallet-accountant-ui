import { expect, test, type Browser, type Page } from "@playwright/test";

// The real-stack smoke test (`make local-smoke`, smoke/smoke.sh): this UI's
// image on a fresh local cluster, with wallet-accountant and Zitadel. Everything
// goes through the UI, nothing is seeded through the API: sign in, redeem the
// bootstrap Invitation code, create a Household and a bank Account, give it a
// Connection with a CSV mapping, import a statement, Accept its rows, and close
// the month. Then a second User joins the Household through an Invitation
// link, in a browser context of their own. Then cash and an ATM Transfer: a
// cash Account whose Opening count is corrected, a cash purchase, an ATM
// withdrawal noted In transit, the bank's row Accepted as that Transfer (in
// last month, which is reopened for it), a cash month closed by a count after
// Record the difference…, and the bank leg reversed.
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
const firstUser = { login: env("WA_UI_USER"), password: env("WA_UI_PASSWORD") };
const secondUser = { login: env("WA_UI_SECOND_USER"), password: env("WA_UI_SECOND_PASSWORD") };
type ZitadelUser = typeof firstUser;
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
const firstName = "Smoke tester";
const secondName = "Smoke joiner";
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
const rowLabel = (row: { date: Date; description: string; cents: number }) =>
  [mediumDate(row.date), row.description, euros(row.cents)].join(", ");

// Cash: Wallet starts on the 1st of last month, so that month has ended and
// can close by a count. The ATM withdrawal is in last month on both sides.
const wallet = "Wallet";
const openingCount = 5_000;
const correctedCount = 6_000;
const purchase = { date: dayOfLastMonth(5), description: "Market stall", cents: -1_250 };
const atm = { date: dayOfLastMonth(25), cents: 10_000 };
const atmLeg = "Cash from the ATM";
const atmRow = { date: atm.date, description: "ATM Smoke Street", cents: -atm.cents };
const walletBooks = correctedCount + purchase.cents + atm.cents;
const cashCount = walletBooks - 750;
const exportBalanceWithAtm = exportBalance + atmRow.cents;

/** The bank's next export: only the ATM row, in last month. */
const atmStatementFile = {
  name: "statement-atm.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    [
      "Date,Description,Amount,Reference",
      `${isoDate(atmRow.date)},${atmRow.description},${(atmRow.cents / 100).toFixed(2)},SMOKE-4`,
    ].join("\n") + "\n",
  ),
};

// The sidebar repeats some of what the page says, such as an Account's state.
const main = (page: Page) => page.getByRole("main");
const select = (page: Page, name: string) => page.getByRole("combobox", { name, exact: true });
const stat = (page: Page, term: string) =>
  page
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");

/** Zitadel's v1 login: login name, then password; its optional prompts are skipped. */
async function signInAtZitadel(page: Page, user: ZitadelUser) {
  const config = (await (await page.request.get(`${base}/config.json`)).json()) as {
    oidc: { issuer: string };
  };
  const issuer = new URL(config.oidc.issuer);
  await page.waitForURL((url) => url.host === issuer.host);
  await page.locator("#loginName").fill(user.login);
  await page.locator("#submit-button").click();
  await page.locator("#password").fill(user.password);
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

const accountNav = (page: Page, tab: string) =>
  page.getByRole("navigation", { name: "Account" }).getByRole("link", { name: tab }).click();

/** The Account page's path, /households/…/accounts/…, from the page's URL. */
const accountPath = (page: Page) =>
  /^\/households\/[0-9a-f-]{36}\/accounts\/[0-9a-f-]{36}/.exec(new URL(page.url()).pathname)?.[0] ??
  "";

/** A Transactions row, but not a reversal's. */
const transactionRow = (page: Page, text: string) =>
  page
    .locator("tbody tr")
    .filter({ hasText: text })
    .filter({ hasNot: page.getByText(/^Reversal of/) });

/** The Account's Transactions in last month. */
async function lastMonthTransactions(page: Page, path: string, name: string) {
  await page.goto(`${base}${path}/transactions?booking_month=${isoDate(lastMonth).slice(0, 7)}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** Opens last month from the Account's Months tab. */
async function openLastMonth(page: Page) {
  const month = monthName(lastMonth);
  await accountNav(page, "Months");
  await page.getByRole("link", { name: month, exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: month, exact: true })).toBeVisible();
}

/** Reopens last month, the latest closed one, from its page. */
async function reopenLastMonth(page: Page) {
  const month = monthName(lastMonth);
  await openLastMonth(page);
  await page.getByRole("button", { name: `Reopen ${month}` }).click();
  await page
    .getByRole("dialog", { name: `Reopen ${month}?` })
    .getByRole("button", { name: "Reopen" })
    .click();
  await expect(page.getByText(`${month} is open again.`)).toBeVisible();
}

const recordSheet = (page: Page) => page.getByRole("dialog", { name: "Record a Transaction" });

async function pickOtherSide(page: Page, search: string, option: string) {
  await recordSheet(page).getByRole("combobox", { name: "Other side" }).fill(search);
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** The second User's own browser: no cookies or storage of the first's. */
const newContext = (browser: Browser) => browser.newContext({ locale: "en-US", timezoneId: "UTC" });

const openMembers = (page: Page) =>
  page
    .getByRole("navigation", { name: "Household" })
    .getByRole("link", { name: "Members" })
    .click();

/** The Members table's name cells, oldest member first. */
const memberNames = (page: Page) =>
  page.getByRole("table", { name: "Members" }).getByRole("row").locator("td:first-child");

test("a new User signs in, imports a statement and closes last month; a second User joins; cash and an ATM Transfer", async ({
  page,
  browser,
}) => {
  let householdPath = "";
  await test.step("sign in, redeem the bootstrap code and create a Household", async () => {
    await page.goto(`${base}/`);
    await signInAtZitadel(page, firstUser);

    await expect(page).toHaveURL(`${base}/register`);
    await page.getByRole("textbox", { name: "Invitation code" }).fill(invitationCode);
    await page.getByRole("textbox", { name: "Display name" }).fill(firstName);
    await page.getByRole("button", { name: "Redeem" }).click();

    await expect(page).toHaveURL(`${base}/households/new`);
    await page.getByRole("textbox", { name: "Name" }).fill(household);
    await page.getByRole("combobox", { name: "Base currency" }).fill("eur");
    await page.getByRole("option", { name: "EUR — Euro" }).click();
    await page.getByRole("button", { name: "Create Household" }).click();

    await expect(page).toHaveURL(/\/households\/[0-9a-f-]{36}$/);
    householdPath = new URL(page.url()).pathname;
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
  let invitationLink = "";
  await test.step("invite someone from Members, and read the link once", async () => {
    await openMembers(page);
    await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    await expect(memberNames(page)).toHaveText([`${firstName} (you)`]);

    await page
      .getByRole("region", { name: "Open Invitations" })
      .getByRole("button", { name: "Invite someone" })
      .click();
    const dialog = page.getByRole("dialog", { name: `Invite someone to ${household}` });
    await dialog.getByRole("button", { name: "Create Invitation" }).click();
    const link = dialog.getByRole("textbox", { name: "Invitation link" });
    await expect(link).not.toHaveValue("");
    invitationLink = await link.inputValue();
    expect(invitationLink.startsWith(`${base}/join?invitation_code=`)).toBe(true);
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("table", { name: "Open Invitations" }).getByRole("row"),
    ).toHaveCount(2);
  });

  const second = await newContext(browser);
  try {
    const joiner = await second.newPage();
    await test.step("a second User opens the link, is sent to /register and Redeems", async () => {
      await joiner.goto(invitationLink);
      await signInAtZitadel(joiner, secondUser);

      // Not a User yet: /join forwards to /register with the code.
      const code = new URL(invitationLink).searchParams.get("invitation_code") ?? "";
      await expect(joiner).toHaveURL(`${base}/register?invitation_code=${code}`);
      await expect(joiner.getByRole("textbox", { name: "Invitation code" })).toHaveValue(code);
      await joiner.getByRole("textbox", { name: "Display name" }).fill(secondName);
      await joiner.getByRole("button", { name: "Redeem" }).click();

      await expect(joiner).toHaveURL(`${base}${householdPath}`);
      await expect(joiner.getByRole("button", { name: /^Household/ })).toContainText(household);
    });

    await test.step("both Users see two members", async () => {
      await openMembers(joiner);
      await expect(memberNames(joiner)).toHaveText([firstName, `${secondName} (you)`]);

      await page.reload();
      await expect(memberNames(page)).toHaveText([`${firstName} (you)`, secondName]);
      // The Invitation was used up.
      await expect(page.getByRole("region", { name: "Open Invitations" })).toContainText(
        "No open Invitations.",
      );
    });
  } finally {
    await second.close();
  }

  await test.step("the first User's bell says the second joined", async () => {
    const bell = page.getByRole("button", { name: /^Notifications/ });
    // Raised as the join is projected: reload until it's there.
    await expect(async () => {
      await page.reload();
      await bell.click();
      await expect(
        page
          .getByRole("dialog", { name: "Notifications" })
          .getByRole("listitem")
          .filter({ hasText: `${secondName} joined the Household` }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  });

  let walletPath = "";
  await test.step("add a cash Account, Wallet, from the 1st of last month, and correct its Opening count", async () => {
    await page.goto(`${base}${householdPath}`);
    await page.getByRole("main").getByRole("button", { name: "Add Account" }).click();
    const dialog = page.getByRole("dialog", { name: "Add Account" });
    await dialog.getByRole("textbox", { name: "Name" }).fill(wallet);
    await dialog.getByRole("radio", { name: "Cash" }).check();
    await dialog.getByRole("textbox", { name: "Start date" }).fill(usDate(lastMonth));
    const count = (openingCount / 100).toFixed(2);
    await dialog.getByRole("textbox", { name: "Opening count (EUR)" }).fill(count);
    await dialog.getByRole("textbox", { name: "Opening count again (EUR)" }).fill(count);
    await dialog.getByRole("button", { name: "Add Account" }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByRole("heading", { level: 1, name: wallet })).toBeVisible();
    await expect(main(page).getByText(`Cash · EUR · ${euros(openingCount)}`)).toBeVisible();
    walletPath = accountPath(page);

    await page.getByRole("button", { name: "More Account actions" }).click();
    await page.getByRole("menuitem", { name: "Correct opening count…" }).click();
    const correct = page.getByRole("dialog", { name: "Correct opening count" });
    const corrected = (correctedCount / 100).toFixed(2);
    await correct.getByRole("textbox", { name: "Opening count (EUR)" }).fill(corrected);
    await correct.getByRole("textbox", { name: "Opening count again (EUR)" }).fill(corrected);
    await correct.getByRole("button", { name: "Correct opening count" }).click();
    await expect(correct).toBeHidden();
    await expect(main(page).getByText(`Cash · EUR · ${euros(correctedCount)}`)).toBeVisible();
  });

  await test.step("record a cash purchase against Groceries", async () => {
    await page.getByRole("button", { name: "Record a Transaction" }).click();
    const sheet = recordSheet(page);
    await sheet
      .getByRole("textbox", { name: "Amount (EUR)" })
      .fill((purchase.cents / 100).toFixed(2));
    await pickOtherSide(page, "Groceries", "Groceries");
    await sheet.getByRole("textbox", { name: "Date" }).fill(usDate(purchase.date));
    await sheet.getByRole("textbox", { name: "Description" }).fill(purchase.description);
    await sheet.getByRole("button", { name: "Save", exact: true }).click();
    await expect(sheet).toBeHidden();

    await expect(
      page.getByRole("combobox", { name: `Category for ${rowLabel(purchase)}` }),
    ).toHaveValue("Groceries");
    await expect(
      main(page).getByText(`Cash · EUR · ${euros(correctedCount + purchase.cents)}`),
    ).toBeVisible();
  });

  await test.step("note an ATM withdrawal in Wallet as a Transfer from the bank: In transit", async () => {
    await page.getByRole("button", { name: "Record a Transaction" }).click();
    const sheet = recordSheet(page);
    await sheet.getByRole("textbox", { name: "Amount (EUR)" }).fill((atm.cents / 100).toFixed(2));
    await pickOtherSide(page, "smoke", `Transfer from ${account}`);
    await sheet.getByRole("textbox", { name: "Date" }).fill(usDate(atm.date));
    await sheet.getByRole("textbox", { name: "Description" }).fill(atmLeg);
    await sheet.getByRole("button", { name: "Save", exact: true }).click();
    await expect(sheet).toBeHidden();

    const leg = transactionRow(page, atmLeg);
    await expect(leg).toContainText(`Transfer from ${account}`);
    await expect(leg.getByText("In transit", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "In transit only (1)" })).toBeVisible();
    await expect(main(page).getByText(`Cash · EUR · ${euros(walletBooks)}`)).toBeVisible();
  });

  let bankPath = "";
  await test.step("reopen the bank's last month and import a statement with the ATM row", async () => {
    await page
      .getByRole("navigation", { name: "Household" })
      .getByRole("link", { name: account })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: account })).toBeVisible();
    bankPath = accountPath(page);
    // Rows in a closed month aren't imported.
    await reopenLastMonth(page);

    await page.getByRole("link", { name: "Import statement", exact: true }).click();
    await page.getByLabel("Choose a file", { exact: true }).setInputFiles(atmStatementFile);
    await page
      .getByRole("textbox", { name: "Export balance (EUR)", exact: true })
      .fill((exportBalanceWithAtm / 100).toFixed(2));
    await page.getByRole("button", { name: "Import", exact: true }).click();

    await expect(page.getByRole("heading", { level: 3, name: "Statement imported" })).toBeVisible();
    await expect(main(page).getByText("Balance check: Passed")).toBeVisible();
    await expect(stat(page, "Imported")).toHaveText("1");
  });

  await test.step("Accept the ATM row as a Transfer to Wallet, picking the leg noted there", async () => {
    await accountNav(page, "To review");
    const label = rowLabel(atmRow);
    const picker = page.getByRole("combobox", { name: `Category for ${label}` });
    await picker.fill("wallet");
    await page.getByRole("option", { name: `Transfer to ${wallet}` }).click();
    await expect(picker).toHaveValue(`Transfer to ${wallet}`);
    await page.getByRole("button", { name: `Accept ${label}` }).click();

    const dialog = page.getByRole("dialog", { name: `Did you already note this in ${wallet}?` });
    await expect(dialog.getByRole("radio", { name: new RegExp(atmLeg) })).toBeChecked();
    await dialog.getByRole("button", { name: "Accept" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: `Accept ${label}` })).toHaveCount(0);

    // Wallet's leg is Matched: nothing new there, and it's no longer In transit.
    await lastMonthTransactions(page, walletPath, wallet);
    await expect(transactionRow(page, atmLeg)).not.toContainText("In transit");
    await expect(transactionRow(page, atmRow.description)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "In transit only (0)" })).toBeVisible();
  });

  await test.step("close the bank's last month again, with the new Export balance", async () => {
    const closing = monthName(lastMonth);
    await page.goto(`${base}${bankPath}`);
    await openLastMonth(page);
    await page
      .getByRole("textbox", { name: "Statement balance (EUR)" })
      .fill((exportBalanceWithAtm / 100).toFixed(2));
    await page.getByRole("button", { name: `Close ${closing}` }).click();
    await expect(
      page.getByText(`${closing} closed. ${monthName(thisMonth)} is open.`),
    ).toBeVisible();
  });

  await test.step("close Wallet's last month: a wrong count, Record the difference…, then it passes", async () => {
    const closing = monthName(lastMonth);
    await page.goto(`${base}${walletPath}`);
    await openLastMonth(page);
    await page
      .getByRole("textbox", { name: "Cash count (EUR)" })
      .fill((cashCount / 100).toFixed(2));
    await expect(page.getByRole("textbox", { name: "Counted on" })).toHaveValue(usDate(now));
    const closeButton = page.getByRole("button", { name: `Close ${closing}` });
    await closeButton.click();

    const refusal = page.getByRole("alert").filter({ hasText: `${closing} can't close yet` });
    await expect(refusal).toContainText("The count differs from the books");
    await expect(refusal.getByRole("definition")).toHaveText([
      euros(walletBooks),
      euros(cashCount),
      euros(cashCount - walletBooks),
    ]);

    await refusal.getByRole("button", { name: "Record the difference…" }).click();
    const sheet = recordSheet(page);
    await expect(sheet.getByRole("textbox", { name: "Amount (EUR)" })).toHaveValue(
      ((cashCount - walletBooks) / 100).toFixed(2),
    );
    await pickOtherSide(page, "Groceries", "Groceries");
    await sheet.getByRole("button", { name: "Save", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(main(page).getByText(`Nothing stops ${closing} closing.`)).toBeVisible();

    await closeButton.click();
    await expect(
      page.getByText(`${closing} closed. ${monthName(thisMonth)} is open.`),
    ).toBeVisible();
  });

  await test.step("reverse the bank leg, once its month is reopened: the row is back To review, Wallet's leg In transit", async () => {
    // From Wallet's leg, its Counterpart's Transactions in the leg's month.
    await lastMonthTransactions(page, walletPath, wallet);
    await transactionRow(page, atmLeg).getByRole("link", { name: account }).click();
    await expect(page.getByRole("heading", { level: 1, name: account })).toBeVisible();
    const bankLeg = transactionRow(page, atmRow.description);
    await expect(bankLeg).toContainText(`Transfer to ${wallet}`);
    // Closed: nothing to reverse until it's reopened.
    await expect(bankLeg.getByRole("button", { name: /^Actions for/ })).toHaveCount(0);

    await reopenLastMonth(page);
    await lastMonthTransactions(page, bankPath, account);
    await bankLeg.getByRole("button", { name: /^Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Reverse…" }).click();
    const dialog = page.getByRole("dialog", {
      name: new RegExp(`^Reverse "${atmRow.description}"`),
    });
    await expect(dialog).toContainText(
      `If ${wallet}'s side was recorded by this Accept, it's reversed too. If you noted it by hand, it stays, In transit.`,
    );
    await dialog.getByRole("button", { name: "Reverse" }).click();
    await expect(page.getByRole("dialog").filter({ hasText: "Reversed." })).toBeVisible();
    await expect(bankLeg.getByRole("link", { name: "Reversed" })).toBeVisible();

    await accountNav(page, "To review");
    await expect(page.getByRole("button", { name: `Accept ${rowLabel(atmRow)}` })).toBeVisible();

    await lastMonthTransactions(page, walletPath, wallet);
    const leg = transactionRow(page, atmLeg);
    await expect(leg.getByText("In transit", { exact: true })).toBeVisible();
    await expect(leg.getByRole("link", { name: "Reversed" })).toHaveCount(0);
  });
});
