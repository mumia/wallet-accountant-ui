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

const addAccount = (fields: string) =>
  call(
    "POST",
    `/households/${home}/accounts`,
    `{"name":"Wallet","currency":"EUR","start_date":"2026-11-26",${fields}}`,
  );

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
