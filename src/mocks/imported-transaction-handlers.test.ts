// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseExactJson } from "../api/exact-json";
import type { components } from "../api/schema.gen";
import { mockDb } from "../test/server";

const api = "http://localhost/api";
const home = "0190f5f2-7c00-7000-8000-000000000001";
const main = "0190f5f2-7c00-7000-8000-000000000101";
const savings = "0190f5f2-7c00-7000-8000-000000000103";
/** Main's Pending "Café de Jaren", −18.00, on 2026-11-19 (src/mocks/db.ts). */
const cafeRow = "0190f5f2-7c00-7000-8000-000000000507";

type Account = components["schemas"]["Account"];
type AccountTransaction = components["schemas"]["AccountTransaction"];
type ImportedTransaction = components["schemas"]["ImportedTransaction"];
type TransferSuggestionList = components["schemas"]["TransferSuggestionList"];

async function call(method: string, path: string, body?: string) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    ...(body === undefined ? {} : { body }),
  });
  return { status: response.status, body: parseExactJson(await response.text()) };
}

/** A cash Account counted at 40.00 on `startDate`, November 1, 2026 unless given. */
async function addCash(name = "Wallet", currency = "EUR", startDate = "2026-11-01") {
  const { body } = await call(
    "POST",
    `/households/${home}/accounts`,
    `{"name":"${name}","kind":"CASH","currency":"${currency}","start_date":"${startDate}","opening_count":{"amount":40.00,"currency":"${currency}"},"opening_count_confirmation":{"amount":40.00,"currency":"${currency}"}}`,
  );
  return (body as Account).account_id;
}

/** A Transfer leg noted by hand on the cash Account, In transit until Matched. */
async function noteLeg(cash: string, date: string, amount = "18", counterpart = main) {
  const { body } = await call(
    "POST",
    `/households/${home}/accounts/${cash}/transactions`,
    `{"date":"${date}","amount":{"amount":${amount},"currency":"EUR"},"description":"ATM","counterpart_account_id":"${counterpart}"}`,
  );
  return body as AccountTransaction;
}

const suggestions = (cash: string, row = cafeRow) =>
  call(
    "GET",
    `/households/${home}/imported-transactions/${row}/transfer-suggestions?account_id=${cash}`,
  );

const accept = (body: string, row = cafeRow) =>
  call("POST", `/households/${home}/imported-transactions/${row}/accept`, body);

const transactionsOfMonth = async (accountId: string, month: string) =>
  (
    (
      await call(
        "GET",
        `/households/${home}/accounts/${accountId}/transactions?booking_month=${month}&limit=200`,
      )
    ).body as { items: AccountTransaction[] }
  ).items;

const transactionsOf = (accountId: string) => transactionsOfMonth(accountId, "2026-11");

const balanceOf = async (accountId: string) =>
  ((await call("GET", `/households/${home}/accounts/${accountId}`)).body as Account).balance;

const rowState = async (row = cafeRow) => {
  const { body } = await call(
    "GET",
    `/households/${home}/accounts/${main}/imported-transactions?state=PENDING`,
  );
  return (body as { items: ImportedTransaction[] }).items.some(
    ({ imported_transaction_id }) => imported_transaction_id === row,
  )
    ? "PENDING"
    : "not pending";
};

describe("GET …/transfer-suggestions", () => {
  it("lists In transit legs naming the row's Account with the opposite amount, within 7 days, closest first", async () => {
    const wallet = await addCash();
    const later = await noteLeg(wallet, "2026-11-21");
    const closest = await noteLeg(wallet, "2026-11-18");
    await noteLeg(wallet, "2026-11-11"); // 8 days before
    await noteLeg(wallet, "2026-11-19", "17"); // another amount
    await noteLeg(wallet, "2026-11-19", "-18"); // the same sign as the row
    await noteLeg(wallet, "2026-11-19", "18", savings); // another Counterpart

    const { status, body } = await suggestions(wallet);

    expect(status).toBe(200);
    const { legs, imported_transactions } = body as TransferSuggestionList;
    expect(imported_transactions).toEqual([]);
    expect(legs.map(({ transaction_id }) => transaction_id)).toEqual([
      closest.transaction_id,
      later.transaction_id,
    ]);
    expect(legs[0]).toMatchObject({
      account_id: wallet,
      counterpart_account_id: main,
      amount: { amount: "18.00", currency: "EUR" },
    });
  });

  it("looks on every cash Account in the row's currency when none is named", async () => {
    const wallet = await addCash();
    const purse = await addCash("Purse");
    await addCash("Dollars", "USD");
    const inWallet = await noteLeg(wallet, "2026-11-18");
    const inPurse = await noteLeg(purse, "2026-11-19");

    const { status, body } = await call(
      "GET",
      `/households/${home}/imported-transactions/${cafeRow}/transfer-suggestions`,
    );

    expect(status).toBe(200);
    const { legs } = body as TransferSuggestionList;
    expect(legs.map(({ transaction_id, account_id }) => [transaction_id, account_id])).toEqual([
      [inPurse.transaction_id, purse],
      [inWallet.transaction_id, wallet],
    ]);
  });

  it("leaves out a leg already Matched", async () => {
    const wallet = await addCash();
    const leg = await noteLeg(wallet, "2026-11-19");
    await accept(
      `{"transfer_account_id":"${wallet}","match_transaction_id":"${leg.transaction_id}"}`,
    );

    expect(((await suggestions(wallet)).body as TransferSuggestionList).legs).toEqual([]);
  });

  it("refuses a statement Account and an unknown one", async () => {
    expect((await suggestions(savings)).body).toMatchObject({
      status: 422,
      type: "/problems/invalid-transfer",
      reason: "COUNTERPART_NOT_CASH",
    });
    expect((await suggestions(crypto.randomUUID())).body).toMatchObject({
      reason: "UNKNOWN_ACCOUNT",
    });
  });
});

describe("POST …/accept with a Transfer", () => {
  it("records the bank leg and a cash leg on the row's Transaction date, Matched", async () => {
    const wallet = await addCash();

    const { status, body } = await accept(`{"transfer_account_id":"${wallet}"}`);

    expect(status).toBe(200);
    const accepted = body as ImportedTransaction;
    expect(accepted.state).toBe("ACCEPTED");
    const bankLeg = (await transactionsOf(main)).find(
      ({ transaction_id }) => transaction_id === accepted.transaction_id,
    );
    expect(bankLeg).toMatchObject({
      amount: { amount: "-18.00" },
      category_name: "Account transfer",
      counterpart_account_id: wallet,
      imported_transaction_id: cafeRow,
    });
    const cashLeg = (await transactionsOf(wallet)).find(
      ({ counterpart_account_id }) => counterpart_account_id === main,
    );
    expect(cashLeg).toMatchObject({
      booking_date: "2026-11-19",
      transaction_date: "2026-11-19",
      description: "Café de Jaren",
      amount: { amount: "18.00", currency: "EUR" },
      category_name: "Account transfer",
      created_by_transfer: true,
      match_id: bankLeg?.match_id,
    });
    expect(bankLeg?.match_id).toBeDefined();
    expect(await balanceOf(wallet)).toEqual({ amount: "58.00", currency: "EUR" });
  });

  it("Matches the given leg instead of recording one", async () => {
    const wallet = await addCash();
    // Noted 10 days away: there is no date window when the leg is given.
    const leg = await noteLeg(wallet, "2026-11-09");

    const { status } = await accept(
      `{"transfer_account_id":"${wallet}","match_transaction_id":"${leg.transaction_id}"}`,
    );

    expect(status).toBe(200);
    const legs = (await transactionsOf(wallet)).filter(
      ({ counterpart_account_id }) => counterpart_account_id === main,
    );
    expect(legs).toHaveLength(1);
    expect(legs[0]?.match_id).toBeDefined();
    expect(legs[0]?.created_by_transfer).toBeUndefined();
    expect(
      (await transactionsOf(main)).find(
        ({ imported_transaction_id }) => imported_transaction_id === cafeRow,
      )?.match_id,
    ).toBe(legs[0]?.match_id);
    expect(await balanceOf(wallet)).toEqual({ amount: "58.00", currency: "EUR" });
  });

  it.each([
    [
      "both a Category and a Transfer",
      (wallet: string) =>
        `{"category_id":"${crypto.randomUUID()}","transfer_account_id":"${wallet}"}`,
      "CATEGORY_AND_TRANSFER",
    ],
    [
      "a leg to Match without a Transfer",
      () => `{"match_transaction_id":"${crypto.randomUUID()}"}`,
      "MATCH_WITHOUT_TRANSFER",
    ],
    [
      "a leg that isn't the cash Account's",
      (wallet: string) =>
        `{"transfer_account_id":"${wallet}","match_transaction_id":"${crypto.randomUUID()}"}`,
      "NOT_A_MATCHING_LEG",
    ],
    ["a statement Account", () => `{"transfer_account_id":"${savings}"}`, "COUNTERPART_NOT_CASH"],
    ["the row's own Account", () => `{"transfer_account_id":"${main}"}`, "SAME_ACCOUNT"],
  ])("refuses %s, leaving the row To review", async (_, body, reason) => {
    const wallet = await addCash();

    const { status, body: problem } = await accept(body(wallet));

    expect(status).toBe(422);
    expect(problem).toMatchObject({ type: "/problems/invalid-transfer", reason });
    expect(await rowState()).toBe("PENDING");
    expect(await balanceOf(wallet)).toEqual({ amount: "40.00", currency: "EUR" });
  });

  it("refuses a leg with another amount as NOT_A_MATCHING_LEG", async () => {
    const wallet = await addCash();
    const leg = await noteLeg(wallet, "2026-11-19", "17");

    const { body } = await accept(
      `{"transfer_account_id":"${wallet}","match_transaction_id":"${leg.transaction_id}"}`,
    );

    expect(body).toMatchObject({ reason: "NOT_A_MATCHING_LEG" });
  });

  it("refuses a cash Account that started after the row's Transaction date, booking nothing", async () => {
    const late = await addCash("Late", "EUR", "2026-11-20");
    const mainBalance = await balanceOf(main);

    const { status, body } = await accept(`{"transfer_account_id":"${late}"}`);

    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/invalid-transfer",
      reason: "BEFORE_START_DATE",
      account_id: late,
      detail: expect.stringContaining(
        "The row's date, 2026-11-19, is before the cash Account's start date, 2026-11-20",
      ) as unknown,
    });
    expect(await rowState()).toBe("PENDING");
    expect(await balanceOf(late)).toEqual({ amount: "40.00", currency: "EUR" });
    expect(await balanceOf(main)).toEqual(mainBalance);
  });

  it("takes a cash Account that started on the row's Transaction date", async () => {
    const onTheDay = await addCash("On the day", "EUR", "2026-11-19");

    const { status } = await accept(`{"transfer_account_id":"${onTheDay}"}`);

    expect(status).toBe(200);
  });

  it("refuses a cash Account in another currency", async () => {
    const purse = await addCash("Purse", "USD");

    const { body } = await accept(`{"transfer_account_id":"${purse}"}`);

    expect(body).toMatchObject({ reason: "CURRENCY_MISMATCH" });
    expect(await rowState()).toBe("PENDING");
  });
});

describe("POST …/reverse on a Transfer leg", () => {
  const reverse = (transactionId: string) =>
    call("POST", `/households/${home}/transactions/${transactionId}/reverse`);
  const legOn = async (accountId: string, counterpart: string) =>
    (await transactionsOf(accountId)).find(
      ({ counterpart_account_id, reversal_of_transaction_id }) =>
        counterpart_account_id === counterpart && reversal_of_transaction_id === undefined,
    );

  it("puts a bank leg's row back To review and reverses the cash leg the Accept recorded", async () => {
    const wallet = await addCash();
    await accept(`{"transfer_account_id":"${wallet}"}`);
    const bankLeg = await legOn(main, wallet);

    const { status } = await reverse(bankLeg?.transaction_id ?? "");

    expect(status).toBe(201);
    expect(await rowState()).toBe("PENDING");
    expect((await legOn(main, wallet))?.reversed_by_transaction_id).toBeDefined();
    const cashLeg = await legOn(wallet, main);
    expect(cashLeg?.reversed_by_transaction_id).toBeDefined();
    expect(cashLeg?.match_id).toBeUndefined();
    expect(await balanceOf(wallet)).toEqual({ amount: "40.00", currency: "EUR" });
  });

  it("leaves a cash leg noted by hand In transit when the bank leg is reversed", async () => {
    const wallet = await addCash();
    const noted = await noteLeg(wallet, "2026-11-19");
    await accept(
      `{"transfer_account_id":"${wallet}","match_transaction_id":"${noted.transaction_id}"}`,
    );

    await reverse((await legOn(main, wallet))?.transaction_id ?? "");

    expect(await rowState()).toBe("PENDING");
    const cashLeg = await legOn(wallet, main);
    expect(cashLeg?.reversed_by_transaction_id).toBeUndefined();
    expect(cashLeg?.match_id).toBeUndefined();
    expect(await balanceOf(wallet)).toEqual({ amount: "58.00", currency: "EUR" });
  });

  it("reverses a cash leg alone, leaving the bank leg Accepted, In transit", async () => {
    const wallet = await addCash();
    await accept(`{"transfer_account_id":"${wallet}"}`);

    const { status } = await reverse((await legOn(wallet, main))?.transaction_id ?? "");

    expect(status).toBe(201);
    expect(await rowState()).toBe("not pending");
    const bankLeg = await legOn(main, wallet);
    expect(bankLeg?.reversed_by_transaction_id).toBeUndefined();
    expect(bankLeg?.match_id).toBeUndefined();
    expect(await balanceOf(wallet)).toEqual({ amount: "40.00", currency: "EUR" });
  });

  it("reverses both legs of a cash ↔ cash Transfer", async () => {
    const wallet = await addCash();
    const purse = await addCash("Purse");
    await noteLeg(wallet, "2026-11-19", "-5", purse);

    const { status } = await reverse((await legOn(purse, wallet))?.transaction_id ?? "");

    expect(status).toBe(201);
    for (const [on, other] of [
      [wallet, purse],
      [purse, wallet],
    ] as const) {
      const leg = await legOn(on, other);
      expect(leg?.reversed_by_transaction_id).toBeDefined();
      expect(leg?.match_id).toBeUndefined();
      expect(await balanceOf(on)).toEqual({ amount: "40.00", currency: "EUR" });
    }
  });

  it("refuses when the other leg's month is closed, naming its Account, and reverses nothing", async () => {
    const wallet = await addCash("Wallet", "EUR", "2026-10-01");
    const purse = await addCash("Purse", "EUR", "2026-10-01");
    await noteLeg(wallet, "2026-10-15", "-5", purse);
    const closed = await call(
      "POST",
      `/households/${home}/accounts/${purse}/months/2026-10/close`,
      `{"statement_balance":{"amount":45.00,"currency":"EUR"},"counted_on":"2026-11-01"}`,
    );
    expect(closed.status).toBe(200);
    const leg = (await transactionsOfMonth(wallet, "2026-10")).find(
      ({ counterpart_account_id }) => counterpart_account_id === purse,
    );

    const { status, body } = await reverse(leg?.transaction_id ?? "");

    expect(status).toBe(409);
    expect(body).toMatchObject({
      type: "/problems/month-closed",
      booking_month: "2026-10",
      account_id: purse,
    });
    const after = (await transactionsOfMonth(wallet, "2026-10")).find(
      ({ transaction_id }) => transaction_id === leg?.transaction_id,
    );
    expect(after?.reversed_by_transaction_id).toBeUndefined();
    expect(after?.match_id).toBe(leg?.match_id);
  });
});

describe("ImportedTransaction.account_id", () => {
  it("names the row's Account when listed and when Accepted", async () => {
    const { body } = await call(
      "GET",
      `/households/${home}/accounts/${main}/imported-transactions`,
    );
    const { items } = body as { items: ImportedTransaction[] };
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(({ account_id }) => account_id === main)).toBe(true);

    const accepted = await accept("{}");
    expect(accepted.body).toMatchObject({ imported_transaction_id: cafeRow, account_id: main });
  });
});

describe("loan and crypto wallet Accounts in Transfers", () => {
  const loanRow = "0190f5f2-7c00-7000-8000-00000000f001";

  /** A loan Account, with one pending −18.00 row on 2026-11-19 when `withRow`. */
  async function addLoan(kind = "LOAN", withRow = false) {
    const { body } = await call(
      "POST",
      `/households/${home}/accounts`,
      `{"name":"Mortgage","kind":"${kind}","currency":"EUR","start_date":"2026-11-01"}`,
    );
    const loan = (body as Account).account_id;
    if (withRow) {
      const state = mockDb.read();
      mockDb.write({
        ...state,
        importedRows: {
          ...state.importedRows,
          [loan]: [
            {
              imported_transaction_id: loanRow,
              statement_import_id: "0190f5f2-7c00-7000-8000-00000000f002",
              state: "PENDING",
              line: 2,
              booking_date: "2026-11-19",
              transaction_date: "2026-11-19",
              amount: { amount: "-18.00", currency: "EUR" },
              description: "Repayment",
            },
          ],
        },
      });
    }
    return loan;
  }

  const refusedFor = (account: string) => ({
    status: 422,
    type: "/problems/invalid-transfer",
    reason: "ACCOUNT_KIND_NOT_SUPPORTED",
    account_id: account,
  });

  it.each(["LOAN", "CRYPTO_WALLET"])(
    "refuses a bank row Accepted as a Transfer to a %s",
    async (kind) => {
      const loan = await addLoan(kind);

      const { status, body } = await accept(`{"transfer_account_id":"${loan}"}`);

      expect(status).toBe(422);
      expect(body).toMatchObject(refusedFor(loan));
      expect(await rowState()).toBe("PENDING");
    },
  );

  it("refuses a loan row Accepted as a Transfer to cash, naming the loan", async () => {
    const wallet = await addCash();
    const loan = await addLoan("LOAN", true);

    const { body } = await accept(`{"transfer_account_id":"${wallet}"}`, loanRow);

    expect(body).toMatchObject(refusedFor(loan));
  });

  it("refuses suggestions for a loan row, with or without an Account named", async () => {
    const wallet = await addCash();
    const loan = await addLoan("LOAN", true);

    expect((await suggestions(wallet, loanRow)).body).toMatchObject(refusedFor(loan));
    expect(
      (
        await call(
          "GET",
          `/households/${home}/imported-transactions/${loanRow}/transfer-suggestions`,
        )
      ).body,
    ).toMatchObject(refusedFor(loan));
  });

  it("refuses a cash leg naming a loan", async () => {
    const wallet = await addCash();
    const loan = await addLoan();

    const { status, body } = await call(
      "POST",
      `/households/${home}/accounts/${wallet}/transactions`,
      `{"date":"2026-11-19","amount":{"amount":-5,"currency":"EUR"},"description":"To the loan","counterpart_account_id":"${loan}"}`,
    );

    expect(status).toBe(422);
    expect(body).toMatchObject(refusedFor(loan));
  });
});
