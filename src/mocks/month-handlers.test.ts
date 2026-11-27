// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseExactJson } from "../api/exact-json";
import type { components } from "../api/schema.gen";

const api = "http://localhost/api";
const home = "0190f5f2-7c00-7000-8000-000000000001";
const main = "0190f5f2-7c00-7000-8000-000000000101";

type Account = components["schemas"]["Account"];
type AccountMonth = components["schemas"]["AccountMonth"];
type MonthCloseProblem = components["schemas"]["MonthCloseProblem"];

/** Sends `body` as written, so amounts stay exact JSON numbers such as -2.50. */
async function call(method: string, path: string, body?: string) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    ...(body === undefined ? {} : { body }),
  });
  return { status: response.status, body: parseExactJson(await response.text()) };
}

/** A cash Account counted at €40.00 on 5 October 2026: October is its open month. */
async function addWallet() {
  const { body } = await call(
    "POST",
    `/households/${home}/accounts`,
    `{"name":"Wallet","kind":"CASH","currency":"EUR","start_date":"2026-10-05","opening_count":{"amount":40.00,"currency":"EUR"},"opening_count_confirmation":{"amount":40.00,"currency":"EUR"}}`,
  );
  return (body as Account).account_id;
}

const record = (accountId: string, date: string, amount: string) =>
  call(
    "POST",
    `/households/${home}/accounts/${accountId}/transactions`,
    `{"date":"${date}","amount":{"amount":${amount},"currency":"EUR"},"description":"Coffee","category_id":"${groceries}"}`,
  );

let groceries = "";

const monthPath = (accountId: string, month: string) =>
  `/households/${home}/accounts/${accountId}/months/${month}`;

const close = (accountId: string, month: string, count: string, countedOn?: string) =>
  call(
    "POST",
    `${monthPath(accountId, month)}/close`,
    `{"statement_balance":{"amount":${count},"currency":"EUR"}${
      countedOn === undefined ? "" : `,"counted_on":"${countedOn}"`
    }}`,
  );

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-22T10:00:00Z"));
  const { body } = await call("GET", `/households/${home}/categories`);
  const find = (nodes: components["schemas"]["CategoryTree"]["items"]): string | undefined => {
    for (const node of nodes) {
      const found = node.name === "Groceries" ? node.category_id : find(node.children ?? []);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  };
  groceries = find((body as components["schemas"]["CategoryTree"]).items) ?? "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST …/months/{month}/close for a cash Account", () => {
  it("requires counted_on, as invalid-month-closing", async () => {
    const wallet = await addWallet();

    const { status, body } = await close(wallet, "2026-10", "40");

    expect(status).toBe(400);
    expect(body).toMatchObject({
      type: "/problems/invalid-month-closing",
      detail: "A cash month closes by a Cash count: send counted_on, the day the cash was counted.",
    });
  });

  it("refuses counted_on for a statement Account", async () => {
    const { status, body } = await close(main, "2026-10", "1234.50", "2026-11-03");

    expect(status).toBe(400);
    expect(body).toMatchObject({
      type: "/problems/invalid-month-closing",
      detail: "Only a cash Account's month closes by a count: leave out counted_on.",
    });
  });

  it.each(["", "2026-11-3x", "2026-02-30"])(
    "refuses a counted_on that isn't a date, %j, as a bad request",
    async (countedOn) => {
      const wallet = await addWallet();

      const { status, body } = await close(wallet, "2026-10", "40", countedOn);

      expect(status).toBe(400);
      expect(body).toMatchObject({
        title: "Bad Request",
        detail: "Invalid value for: counted_on.",
      });
    },
  );

  it.each([
    ["on the month's last day", "2026-10-31"],
    ["after today", "2026-11-23"],
  ])("refuses a count taken %s, as invalid-count-date", async (_, countedOn) => {
    const wallet = await addWallet();

    const { status, body } = await close(wallet, "2026-10", "40", countedOn);

    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/invalid-count-date",
      detail: "The cash must be counted after October 2026 ends, and no later than today.",
    });
  });

  it("compares the count with the books at the end of Counted on", async () => {
    const wallet = await addWallet();
    // After the month, before the count, and after the count.
    await record(wallet, "2026-11-10", "-5");
    await record(wallet, "2026-11-20", "-1");

    const { status, body } = await close(wallet, "2026-10", "40", "2026-11-15");

    expect(status).toBe(422);
    expect((body as MonthCloseProblem).reasons).toEqual(["BALANCE_MISMATCH"]);
    expect(body).toMatchObject({
      computed_balance: { amount: "35.00", currency: "EUR" },
      statement_balance: { amount: "40.00", currency: "EUR" },
      difference: { amount: "5.00", currency: "EUR" },
    });
  });

  it("stores the month-end balance the count proves, and Counted on", async () => {
    const wallet = await addWallet();
    await record(wallet, "2026-11-10", "-5");

    const { status, body } = await close(wallet, "2026-10", "35", "2026-11-15");

    expect(status).toBe(200);
    expect(body as AccountMonth).toMatchObject({
      state: "CLOSED",
      statement_balance: { amount: "40.00", currency: "EUR" },
      counted_on: "2026-11-15",
    });
    const read = await call("GET", monthPath(wallet, "2026-10"));
    expect(read.body).toMatchObject({ counted_on: "2026-11-15" });
  });

  it("closes after the difference is recorded", async () => {
    const wallet = await addWallet();
    expect((await close(wallet, "2026-10", "37.50", "2026-11-03")).status).toBe(422);

    await record(wallet, "2026-10-31", "-2.50");

    expect((await close(wallet, "2026-10", "37.50", "2026-11-03")).status).toBe(200);
  });
});

describe("POST …/months/{month}/reopen for a cash Account", () => {
  it("reopens even with Transactions in later months", async () => {
    const wallet = await addWallet();
    expect((await close(wallet, "2026-10", "40", "2026-11-01")).status).toBe(200);
    await record(wallet, "2026-11-10", "-5");
    const months = (await call("GET", `/households/${home}/accounts/${wallet}/months`)).body as {
      items: AccountMonth[];
    };
    expect(months.items.find(({ booking_month }) => booking_month === "2026-10")).toMatchObject({
      reopen_blocked: false,
    });

    const { status, body } = await call("POST", `${monthPath(wallet, "2026-10")}/reopen`);

    expect(status).toBe(200);
    expect(body as AccountMonth).toMatchObject({ state: "OPEN" });
    expect(body).not.toHaveProperty("counted_on");
  });
});
