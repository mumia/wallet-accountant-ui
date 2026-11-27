// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseExactJson } from "../api/exact-json";
import type { components } from "../api/schema.gen";

const api = "http://localhost/api";
const home = "0190f5f2-7c00-7000-8000-000000000001";

type Account = components["schemas"]["Account"];
type Problem = components["schemas"]["Problem"];
type TransactionList = components["schemas"]["AccountTransactionPage"];

/** Sends `body` as written, so amounts stay exact JSON numbers such as 40.00. */
async function call(method: string, path: string, body?: string) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    ...(body === undefined ? {} : { body }),
  });
  return { status: response.status, body: parseExactJson(await response.text()) };
}

const addAccount = (fields: string, startDate = "2026-11-26") =>
  call(
    "POST",
    `/households/${home}/accounts`,
    `{"name":"Wallet","currency":"EUR","start_date":"${startDate}",${fields}}`,
  );

/** A cash Account counted at €40.00 on `startDate`. */
async function addWallet(startDate?: string) {
  const { body } = await addAccount(
    `"kind":"CASH","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}`,
    startDate,
  );
  return body as Account;
}

const recount = (accountId: string, count: string, again = count) =>
  call(
    "POST",
    `/households/${home}/accounts/${accountId}/opening-count`,
    `{"opening_count":{"amount":${count},"currency":"EUR"},"opening_count_confirmation":{"amount":${again},"currency":"EUR"}}`,
  );

const transactionsOf = async (accountId: string) =>
  (
    (await call("GET", `/households/${home}/accounts/${accountId}/transactions`))
      .body as TransactionList
  ).items;

describe("POST …/accounts", () => {
  it("adds a cash Account with its Opening balance Transaction and a balance", async () => {
    const { status, body } = await addAccount(
      `"kind":"CASH","opening_count":{"amount":40.5,"currency":"EUR"},"opening_count_confirmation":{"amount":40.50,"currency":"EUR"}`,
    );

    expect(status).toBe(201);
    const account = body as Account;
    expect(account).toMatchObject({
      kind: "CASH",
      awaiting_first_statement_import: false,
      balance: { amount: "40.50", currency: "EUR" },
      open_month: "2026-11",
    });
    const transactions = await call(
      "GET",
      `/households/${home}/accounts/${account.account_id}/transactions`,
    );
    expect((transactions.body as TransactionList).items).toMatchObject([
      {
        booking_date: "2026-11-26",
        description: "Opening balance",
        amount: { amount: "40.50", currency: "EUR" },
        category_name: "Opening balance",
      },
    ]);
  });

  it("refuses two different counts", async () => {
    const { status, body } = await addAccount(
      `"kind":"CASH","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":45.00,"currency":"EUR"}`,
    );

    expect(status).toBe(422);
    expect((body as Problem).type).toBe("/problems/opening-count-mismatch");
  });

  it.each([
    ["a cash Account without its counts", `"kind":"CASH"`],
    [
      "a cash Account counted in another currency",
      `"kind":"CASH","opening_count":{"amount":40,"currency":"USD"},"opening_count_confirmation":{"amount":40,"currency":"USD"}`,
    ],
    [
      "a count with more decimal places than the currency",
      `"kind":"CASH","opening_count":{"amount":40.001,"currency":"EUR"},"opening_count_confirmation":{"amount":40.001,"currency":"EUR"}`,
    ],
    [
      "counts for a statement Account",
      `"kind":"BANK_ACCOUNT","opening_count":{"amount":40,"currency":"EUR"},"opening_count_confirmation":{"amount":40,"currency":"EUR"}`,
    ],
  ])("refuses %s as invalid-account", async (_, fields) => {
    const { status, body } = await addAccount(fields);

    expect(status).toBe(422);
    expect((body as Problem).type).toBe("/problems/invalid-account");
  });

  it("refuses a Connection for a cash Account", async () => {
    const { body } = await addAccount(
      `"kind":"CASH","opening_count":{"amount":0,"currency":"EUR"},"opening_count_confirmation":{"amount":0,"currency":"EUR"}`,
    );

    const { status, body: problem } = await call(
      "POST",
      `/households/${home}/accounts/${(body as Account).account_id}/connections`,
      `{"name":"Statements","kind":"STATEMENT_FILE_IMPORT"}`,
    );
    expect(status).toBe(422);
    expect((problem as Problem).type).toBe("/problems/invalid-connection");
  });
});

describe("POST …/accounts/{id}/opening-count", () => {
  it("replaces the Opening balance Transaction, and the balance follows", async () => {
    const wallet = await addWallet();
    const [opening] = await transactionsOf(wallet.account_id);

    const { status, body } = await recount(wallet.account_id, "45.5", "45.50");

    expect(status).toBe(200);
    expect(body).toMatchObject({ balance: { amount: "45.50", currency: "EUR" } });
    const items = await transactionsOf(wallet.account_id);
    expect(items).toMatchObject([
      { transaction_id: opening?.transaction_id, amount: { amount: "40.00" } },
      {
        reversal_of_transaction_id: opening?.transaction_id,
        booking_date: "2026-11-26",
        amount: { amount: "-40.00" },
      },
      {
        booking_date: "2026-11-26",
        description: "Opening balance",
        amount: { amount: "45.50" },
        category_name: "Opening balance",
      },
    ]);
    expect(items[0]?.reversed_by_transaction_id).toBe(items[1]?.transaction_id);
    const account = await call("GET", `/households/${home}/accounts/${wallet.account_id}`);
    expect(account.body).toMatchObject({ balance: { amount: "45.50" } });
  });

  it("records nothing for the same count again", async () => {
    const wallet = await addWallet();

    const { status, body } = await recount(wallet.account_id, "40");

    expect(status).toBe(200);
    expect(body).toMatchObject({ balance: { amount: "40.00" } });
    expect(await transactionsOf(wallet.account_id)).toHaveLength(1);
  });

  it("refuses two different counts", async () => {
    const wallet = await addWallet();

    const { status, body } = await recount(wallet.account_id, "45.00", "54.00");

    expect(status).toBe(422);
    expect((body as Problem).type).toBe("/problems/opening-count-mismatch");
    expect(await transactionsOf(wallet.account_id)).toHaveLength(1);
  });

  it("refuses a statement Account as not-a-cash-account", async () => {
    const main = "0190f5f2-7c00-7000-8000-000000000101";

    const { status, body } = await recount(main, "45.00");

    expect(status).toBe(422);
    expect((body as Problem).type).toBe("/problems/not-a-cash-account");
  });

  it("refuses once the start month has closed, as opening-count-locked", async () => {
    // A month long ended, so it can close whatever the clock.
    const wallet = await addWallet("2025-01-15");
    const closed = await call(
      "POST",
      `/households/${home}/accounts/${wallet.account_id}/months/2025-01/close`,
      `{"statement_balance":{"amount":40.00,"currency":"EUR"}}`,
    );
    expect(closed.status).toBe(200);

    const { status, body } = await recount(wallet.account_id, "45.00");

    expect(status).toBe(409);
    expect((body as Problem).type).toBe("/problems/opening-count-locked");
  });
});
