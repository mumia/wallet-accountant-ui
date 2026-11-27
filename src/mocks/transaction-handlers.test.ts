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
async function addWallet(startDate = today()) {
  const { body } = await call(
    "POST",
    `/households/${home}/accounts`,
    `{"name":"Wallet","kind":"CASH","currency":"EUR","start_date":"${startDate}","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
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
      `{"statement_balance":{"amount":40.00,"currency":"EUR"}}`,
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
