// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseExactJson } from "../api/exact-json";
import type { components } from "../api/schema.gen";

const api = "http://localhost/api";
const home = "0190f5f2-7c00-7000-8000-000000000001";
const main = "0190f5f2-7c00-7000-8000-000000000101";

type Account = components["schemas"]["Account"];
type Problem = components["schemas"]["Problem"];
type Transaction = components["schemas"]["Transaction"];
type TransactionList = components["schemas"]["AccountTransactionPage"];
type CategoryTree = components["schemas"]["CategoryTree"];

/** Sends `body` as written, so amounts stay exact JSON numbers such as -2.50. */
async function call(
  method: string,
  path: string,
  body?: string,
  key: string = crypto.randomUUID(),
) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    ...(body === undefined ? {} : { body }),
  });
  return { status: response.status, body: parseExactJson(await response.text()) };
}

const today = () => new Date().toISOString().slice(0, 10);

/** A cash Account counted at €40.00 on `startDate`. */
async function addWallet(startDate = today(), name = "Wallet") {
  const { body } = await call(
    "POST",
    `/households/${home}/accounts`,
    `{"name":"${name}","kind":"CASH","currency":"EUR","start_date":"${startDate}","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
  );
  return body as Account;
}

const record = (accountId: string, fields: string, key?: string) =>
  call("POST", `/households/${home}/accounts/${accountId}/transactions`, `{${fields}}`, key);

const coffee = (date = today(), amount = "-2.50") =>
  `"date":"${date}","amount":{"amount":${amount},"currency":"EUR"},"description":"Coffee"`;

async function categoryId(name: string) {
  const { body } = await call("GET", `/households/${home}/categories`);
  const find = (nodes: CategoryTree["items"]): string | undefined => {
    for (const node of nodes) {
      const found = node.name === name ? node.category_id : find(node.children ?? []);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  };
  return find((body as CategoryTree).items) ?? "";
}

const transactionsOf = async (accountId: string) =>
  (
    (await call("GET", `/households/${home}/accounts/${accountId}/transactions`))
      .body as TransactionList
  ).items;

const balanceOf = async (accountId: string) =>
  ((await call("GET", `/households/${home}/accounts/${accountId}`)).body as Account).balance;

describe("POST …/accounts/{id}/transactions", () => {
  it("records a Transaction in a Category, and the balance follows", async () => {
    const wallet = await addWallet();
    const groceries = await categoryId("Groceries");

    const { status, body } = await record(
      wallet.account_id,
      `${coffee()},"payee":"Café Central","category_id":"${groceries}"`,
    );

    expect(status).toBe(201);
    expect(body as Transaction).toMatchObject({
      account_id: wallet.account_id,
      booking_date: today(),
      transaction_date: today(),
      description: "Coffee",
      payee: "Café Central",
      amount: { amount: "-2.50", currency: "EUR" },
      category_id: groceries,
      category_name: "Groceries",
    });
    expect(await transactionsOf(wallet.account_id)).toHaveLength(2);
    expect(await balanceOf(wallet.account_id)).toEqual({ amount: "37.50", currency: "EUR" });
  });

  it("books against Uncategorised with no Category", async () => {
    const wallet = await addWallet();

    const { status, body } = await record(wallet.account_id, coffee(today(), "5"));

    expect(status).toBe(201);
    expect(body).toMatchObject({
      amount: { amount: "5.00" },
      category_name: "Uncategorised",
    });
    expect(await balanceOf(wallet.account_id)).toMatchObject({ amount: "45.00" });
  });

  it("answers a replay with the same Idempotency-Key with what it recorded", async () => {
    const wallet = await addWallet();
    const key = crypto.randomUUID();

    const first = await record(wallet.account_id, coffee(), key);
    const again = await record(wallet.account_id, coffee(), key);

    expect(again.status).toBe(201);
    expect((again.body as Transaction).transaction_id).toBe(
      (first.body as Transaction).transaction_id,
    );
    expect(await transactionsOf(wallet.account_id)).toHaveLength(2);
    expect(await balanceOf(wallet.account_id)).toMatchObject({ amount: "37.50" });
  });

  it("keeps the list in Booking date order", async () => {
    const wallet = await addWallet("2026-01-05");
    // Two days in the start month, the later one recorded first.
    await record(wallet.account_id, coffee("2026-01-20"));
    await record(wallet.account_id, coffee("2026-01-10"));

    expect(
      (await transactionsOf(wallet.account_id)).map(({ booking_date }) => booking_date),
    ).toEqual(["2026-01-05", "2026-01-10", "2026-01-20"]);
  });

  it("refuses a statement Account as not-a-cash-account", async () => {
    const { status, body } = await record(main, coffee());

    expect(status).toBe(422);
    expect((body as Problem).type).toBe("/problems/not-a-cash-account");
  });

  it.each([
    ["a zero amount", coffee(today(), "0.00"), "The amount must not be zero."],
    [
      "a date after today",
      coffee("2999-01-01"),
      "The date is after today: planned money belongs to Planning.",
    ],
    [
      "a date before the start date",
      coffee("2020-01-01"),
      "The date is before the Account's start date.",
    ],
    [
      "more decimal places than the currency",
      coffee(today(), "-2.505"),
      "The amount has more decimal places than the Account currency.",
    ],
  ])("refuses %s as invalid-transaction", async (_, fields, detail) => {
    const wallet = await addWallet();

    const { status, body } = await record(wallet.account_id, fields);

    expect(status).toBe(422);
    expect(body).toMatchObject({ type: "/problems/invalid-transaction", detail });
    expect(await transactionsOf(wallet.account_id)).toHaveLength(1);
  });

  it("refuses an Internal Category other than Uncategorised", async () => {
    const wallet = await addWallet();
    const opening = await categoryId("Opening balance");

    const { status, body } = await record(
      wallet.account_id,
      `${coffee()},"category_id":"${opening}"`,
    );

    expect(status).toBe(422);
    expect((body as Problem).type).toBe("/problems/internal-category");
  });

  it("refuses a date in a closed month, naming the Account", async () => {
    // A month long ended, so it can close whatever the clock.
    const wallet = await addWallet("2025-01-15");
    const closed = await call(
      "POST",
      `/households/${home}/accounts/${wallet.account_id}/months/2025-01/close`,
      `{"statement_balance":{"amount":40.00,"currency":"EUR"},"counted_on":"2025-02-01"}`,
    );
    expect(closed.status).toBe(200);

    const { status, body } = await record(wallet.account_id, coffee("2025-01-20"));

    expect(status).toBe(409);
    expect(body).toMatchObject({
      type: "/problems/month-closed",
      booking_month: "2025-01",
      open_month: "2025-02",
      account_id: wallet.account_id,
    });
  });

  it("takes a date in a month after the open month", async () => {
    const wallet = await addWallet("2025-01-15");

    const { status } = await record(wallet.account_id, coffee());

    expect(status).toBe(201);
  });
});

describe("the Category direction rule", () => {
  const cafeRow = "0190f5f2-7c00-7000-8000-000000000507";

  /** Main's November Transaction described `description`. */
  async function mainNovember(description: string) {
    const { body } = await call(
      "GET",
      `/households/${home}/accounts/${main}/transactions?booking_month=2026-11`,
    );
    const found = (body as TransactionList).items.find(
      (transaction) => transaction.description === description,
    );
    if (found === undefined) {
      throw new Error(`No ${description} in Main's November`);
    }
    return found;
  }

  it("refuses an Expense Category on cash in, naming it, and books nothing", async () => {
    const wallet = await addWallet();
    const groceries = await categoryId("Groceries");

    const { status, body } = await record(
      wallet.account_id,
      `${coffee(today(), "5.00")},"category_id":"${groceries}"`,
    );

    expect(status).toBe(422);
    expect(body).toEqual({
      type: "/problems/category-direction",
      title: "Category doesn't fit the amount",
      status: 422,
      detail:
        "An Expense Category takes only money out, and this amount is money in. Choose an Income Category, or Uncategorised.",
      category_id: groceries,
      category_kind: "EXPENSE",
      direction: "IN",
    });
    expect(await transactionsOf(wallet.account_id)).toHaveLength(1);
  });

  it("refuses an Income Category on cash out", async () => {
    const wallet = await addWallet();
    const salary = await categoryId("Salary");

    const { status, body } = await record(
      wallet.account_id,
      `${coffee()},"category_id":"${salary}"`,
    );

    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/category-direction",
      category_id: salary,
      category_kind: "INCOME",
      direction: "OUT",
    });
  });

  it("refuses Set Category of the wrong kind, and keeps the Category", async () => {
    const bol = await mainNovember("Bol.com");
    const salary = await categoryId("Salary");

    const { status, body } = await call(
      "PATCH",
      `/households/${home}/transactions/${bol.transaction_id}`,
      `{"category_id":"${salary}"}`,
    );

    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/category-direction",
      category_id: salary,
      category_kind: "INCOME",
      direction: "OUT",
    });
    expect((await mainNovember("Bol.com")).category_id).toBe(bol.category_id);
  });

  it("refuses Accept with the wrong kind, leaving the row To review", async () => {
    const salary = await categoryId("Salary");
    const path = `/households/${home}/imported-transactions/${cafeRow}`;

    const { status, body } = await call("POST", `${path}/accept`, `{"category_id":"${salary}"}`);

    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/category-direction",
      category_id: salary,
      category_kind: "INCOME",
      direction: "OUT",
    });
    const accepted = await call("POST", `${path}/accept`, "");
    expect(accepted.status).toBe(200);
  });
});

describe("Transfer legs", () => {
  type TransferProblem = components["schemas"]["TransferProblem"];
  type AccountTransaction = components["schemas"]["AccountTransaction"];
  const atm = (counterpart: string, amount = "50") =>
    `"date":"${today()}","amount":{"amount":${amount},"currency":"EUR"},"description":"ATM","counterpart_account_id":"${counterpart}"`;
  const inTransit = async (accountId: string) =>
    (
      (await call("GET", `/households/${home}/accounts/${accountId}/transactions?in_transit=true`))
        .body as TransactionList
    ).items;

  it("records a leg to a statement Account In transit, against Account transfer", async () => {
    const wallet = await addWallet();

    const { status, body } = await record(wallet.account_id, atm(main));

    expect(status).toBe(201);
    const leg = body as AccountTransaction;
    expect(leg).toMatchObject({
      amount: { amount: "50.00" },
      counterpart_account_id: main,
      category_name: "Account transfer",
    });
    expect(leg.match_id).toBeUndefined();
    expect(await balanceOf(wallet.account_id)).toMatchObject({ amount: "90.00" });
    // Bank's side comes only from its statement row.
    expect(await balanceOf(main)).toMatchObject({ amount: "1234.50" });
    expect(
      (await inTransit(wallet.account_id)).map(({ transaction_id }) => transaction_id),
    ).toEqual([leg.transaction_id]);
  });

  it("records both legs of a cash ↔ cash Transfer, Matched", async () => {
    const wallet = await addWallet();
    const purse = await addWallet(today(), "Purse");

    const { status, body } = await record(wallet.account_id, atm(purse.account_id, "-15"));

    expect(status).toBe(201);
    const own = body as AccountTransaction;
    expect(own).toMatchObject({
      amount: { amount: "-15.00" },
      counterpart_account_id: purse.account_id,
    });
    expect(own.match_id).toBeDefined();
    const theirs = (await transactionsOf(purse.account_id)).find(
      ({ counterpart_account_id }) => counterpart_account_id === wallet.account_id,
    );
    expect(theirs).toMatchObject({
      amount: { amount: "15.00" },
      description: "ATM",
      category_name: "Account transfer",
      match_id: own.match_id,
    });
    expect(await balanceOf(wallet.account_id)).toMatchObject({ amount: "25.00" });
    expect(await balanceOf(purse.account_id)).toMatchObject({ amount: "55.00" });
    expect(await inTransit(wallet.account_id)).toEqual([]);
    expect(await inTransit(purse.account_id)).toEqual([]);
  });

  it("refuses the Transaction's own Account", async () => {
    const wallet = await addWallet();

    const { status, body } = await record(wallet.account_id, atm(wallet.account_id));

    expect(status).toBe(422);
    expect(body as TransferProblem).toMatchObject({
      type: "/problems/invalid-transfer",
      reason: "SAME_ACCOUNT",
    });
  });

  it("refuses an Account that isn't the Household's", async () => {
    const wallet = await addWallet();

    const { status, body } = await record(wallet.account_id, atm(crypto.randomUUID()));

    expect(status).toBe(422);
    expect(body as TransferProblem).toMatchObject({ reason: "UNKNOWN_ACCOUNT" });
  });

  it("refuses an Account in another currency", async () => {
    const wallet = await addWallet();
    const { body: dollars } = await call(
      "POST",
      `/households/${home}/accounts`,
      `{"name":"Dollars","kind":"BANK_ACCOUNT","currency":"USD","start_date":"${today()}"}`,
    );

    const { status, body } = await record(wallet.account_id, atm((dollars as Account).account_id));

    expect(status).toBe(422);
    expect(body as TransferProblem).toMatchObject({
      reason: "CURRENCY_MISMATCH",
      detail: "The counterpart has another Account currency.",
    });
    expect(await transactionsOf(wallet.account_id)).toHaveLength(1);
  });

  const on = (date: string, counterpart: string) =>
    `"date":"${date}","amount":{"amount":-15,"currency":"EUR"},"description":"For the market","counterpart_account_id":"${counterpart}"`;

  it("refuses a date before the cash Counterpart's start date, naming it, and books neither leg", async () => {
    const wallet = await addWallet("2026-01-05");
    const purse = await addWallet("2026-02-01", "Purse");

    const { status, body } = await record(wallet.account_id, on("2026-01-20", purse.account_id));

    expect(status).toBe(422);
    expect(body as TransferProblem).toMatchObject({
      type: "/problems/invalid-transfer",
      reason: "BEFORE_START_DATE",
      account_id: purse.account_id,
      detail: expect.stringContaining(
        "The date, 2026-01-20, is before the counterpart cash Account's start date, 2026-02-01",
      ) as unknown,
    });
    expect(await balanceOf(wallet.account_id)).toMatchObject({ amount: "40.00" });
    expect(await balanceOf(purse.account_id)).toMatchObject({ amount: "40.00" });
  });

  it("takes a date on the cash Counterpart's start date", async () => {
    const wallet = await addWallet("2026-01-05");
    const purse = await addWallet("2026-02-01", "Purse");

    const { status } = await record(wallet.account_id, on("2026-02-01", purse.account_id));

    expect(status).toBe(201);
  });

  it("refuses a date before the Account's own start date as invalid-transaction, whatever the Counterpart", async () => {
    const wallet = await addWallet("2026-02-01");
    const purse = await addWallet("2026-03-01", "Purse");

    const { status, body } = await record(wallet.account_id, on("2026-01-20", purse.account_id));

    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/invalid-transaction",
      detail: "The date is before the Account's start date.",
    });
  });

  it("refuses a date in the Counterpart's closed month, naming it, and books neither leg", async () => {
    const wallet = await addWallet("2026-01-05");
    const purse = await addWallet("2026-01-05", "Purse");
    await call(
      "POST",
      `/households/${home}/accounts/${purse.account_id}/months/2026-01/close`,
      `{"statement_balance":{"amount":40.00,"currency":"EUR"},"counted_on":"2026-02-01"}`,
    );

    const { status, body } = await record(
      wallet.account_id,
      `"date":"2026-01-20","amount":{"amount":-5,"currency":"EUR"},"description":"To Purse","counterpart_account_id":"${purse.account_id}"`,
    );

    expect(status).toBe(409);
    expect(body).toMatchObject({ type: "/problems/month-closed", account_id: purse.account_id });
    expect(await transactionsOf(wallet.account_id)).toHaveLength(1);
    expect(await transactionsOf(purse.account_id)).toHaveLength(1);
  });

  it("refuses a Category change on a leg", async () => {
    const wallet = await addWallet();
    const { body } = await record(wallet.account_id, atm(main));

    const { status, body: refused } = await call(
      "PATCH",
      `/households/${home}/transactions/${(body as Transaction).transaction_id}`,
      `{"category_id":"${await categoryId("Salary")}"}`,
    );

    expect(status).toBe(422);
    expect(refused as Problem).toMatchObject({
      type: "/problems/transfer-leg",
      detail: "A Transfer leg's other side is always the Account transfer Category.",
    });
  });
});
