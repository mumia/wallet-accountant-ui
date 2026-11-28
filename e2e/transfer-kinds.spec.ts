import { expect, test, type Page } from "@playwright/test";

import { comboboxListOpen, expectAccessible } from "./axe";

// Home in the default mock scenario (src/mocks/db.ts). Each test adds Wallet
// (cash) and Mortgage (a loan) through the mock API; Mortgage's first
// statement brings one pending row, Repayment (−€18.00, Nov 19, 2026).
// Loans and crypto wallets take no part in Transfers (statement-transfers
// spec, "Which Accounts take part in Transfers").
const home = "/households/0190f5f2-7c00-7000-8000-000000000001";
const repayment = "Nov 19, 2026, Repayment, -€18.00";

/** The mapping the mock seeds for its Connections (`mockCsvMapping`). */
const mapping = {
  encoding: "UTF_8",
  delimiter: ";",
  has_header_row: true,
  skip_leading_lines: 0,
  skip_trailing_lines: 0,
  date_format: "YYYY-MM-DD",
  decimal_separator: ".",
  thousands_separator: "",
  amount_layout: "SIGNED",
  positive_amount_means: "MONEY_IN",
  columns: {
    booking_date: { header: "Date" },
    description: { header: "Description" },
    amount: { header: "Amount" },
    bank_transaction_id: { header: "Id" },
  },
};

/**
 * Opens Home, so the mock API serves the page, then adds Wallet and Mortgage
 * and confirms Mortgage's first statement. Returns both Account IDs.
 */
async function start(page: Page) {
  await page.goto(home);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  return page.evaluate(
    async ({ home, mapping }) => {
      const json = async (path: string, body: unknown) => {
        const response = await fetch(`/api${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return (await response.json()) as { account_id?: string; connection_id?: string };
      };
      const wallet = await json(`${home}/accounts`, {
        name: "Wallet",
        kind: "CASH",
        currency: "EUR",
        start_date: "2026-11-01",
        opening_count: { amount: "40.00", currency: "EUR" },
        opening_count_confirmation: { amount: "40.00", currency: "EUR" },
      });
      const loan = await json(`${home}/accounts`, {
        name: "Mortgage",
        kind: "LOAN",
        currency: "EUR",
        start_date: "2026-11-01",
      });
      const connection = await json(`${home}/accounts/${loan.account_id ?? ""}/connections`, {
        name: "Bank export",
        kind: "STATEMENT_FILE_IMPORT",
        csv_mapping: mapping,
      });
      const imports = `/api${home}/connections/${connection.connection_id ?? ""}/statement-imports`;
      const form = (extra: Record<string, string>) => {
        const body = new FormData();
        body.append(
          "file",
          new Blob(["Date;Description;Amount;Id\n2026-11-19;Repayment;-18.00;L-1"], {
            type: "text/csv",
          }),
          "statement.csv",
        );
        body.append("export_balance", "-9018.00");
        for (const [name, value] of Object.entries(extra)) {
          body.append(name, value);
        }
        return body;
      };
      const preview = (await (
        await fetch(`${imports}/previews`, {
          method: "POST",
          body: form({ export_balance_confirmation: "-9018.00" }),
        })
      ).json()) as { preview_id: string };
      await fetch(imports, { method: "POST", body: form({ preview_id: preview.preview_id }) });
      return { wallet: wallet.account_id ?? "", loan: loan.account_id ?? "" };
    },
    { home, mapping },
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-22T10:00:00Z"));
});

test("a loan's row offers no Transfer, not even to cash", async ({ page }) => {
  const { loan } = await start(page);
  await page.goto(`${home}/accounts/${loan}/to-review?booking_month=2026-11`);
  await expect(page.getByRole("heading", { level: 1, name: "Mortgage" })).toBeVisible();

  await page.getByRole("combobox", { name: `Category for ${repayment}` }).click();
  // The Categories are offered, but no Transfer group, although Wallet is cash.
  await expect(page.getByRole("option").first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Transfer" })).toHaveCount(0);
  await expectAccessible(page, comboboxListOpen);
});

test("Record a Transaction offers no Transfer to a loan", async ({ page }) => {
  const { wallet } = await start(page);
  await page.goto(`${home}/accounts/${wallet}/transactions`);
  await expect(page.getByRole("heading", { level: 1, name: "Wallet" })).toBeVisible();

  await page.getByRole("button", { name: "Record a Transaction" }).click();
  await page
    .getByRole("dialog", { name: "Record a Transaction" })
    .getByRole("combobox", { name: "Other side" })
    .click();
  const transfers = page.getByRole("group", { name: "Transfer" }).getByRole("option");
  await expect(transfers.filter({ hasText: "Main" })).toHaveCount(1);
  await expect(transfers.filter({ hasText: "Mortgage" })).toHaveCount(0);
});
