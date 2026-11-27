// The mock API's writes of a Transaction: recording a cash one or a Transfer
// leg, a Category change and Reverse (ADR-0018, ADR-0024 and ADR-0026 in the
// backend), with the backend's rules and problems word for word
// (../wallet-accountant/internal/ledger/adapters/http/corrections.go, cash.go).
import { parseExactJson } from "../api/exact-json";
import type { components, Decimal } from "../api/schema.gen";
import { categoryDirection } from "./category-direction";
import type { MockDb, MockState } from "./db";
import { http, withExactAmounts } from "./http";
import { monthOf, monthWords } from "./months";
import { currencyPlaces, fromUnits, toUnits } from "./statement-files";

type Problem = components["schemas"]["Problem"];
type AccountTransaction = components["schemas"]["AccountTransaction"];
type Account = components["schemas"]["Account"];
type CashTransactionCreation = components["schemas"]["CashTransactionCreation"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

const problem = (status: number, type: string, title: string, detail: string): Problem => ({
  type: `/problems/${type}`,
  title,
  status,
  detail,
});

const transactionIsAReversal = problem(
  422,
  "transaction-is-a-reversal",
  "Transaction is a reversal",
  "A reversal can't be reversed or recategorised.",
);
const openingBalanceTransaction = problem(
  422,
  "opening-balance-transaction",
  "Opening balance Transaction",
  "The Opening balance Transaction changes only by voiding the first Statement import.",
);

function monthClosed(month: string, openMonth: string, accountId?: string) {
  return {
    type: "/problems/month-closed",
    title: "Month closed",
    status: 409,
    detail: `${monthWords(month)} is closed. Reopen it to change its entries.`,
    booking_month: month,
    open_month: openMonth,
    ...(accountId === undefined ? {} : { account_id: accountId }),
  };
}

const invalidTransaction = (detail: string) =>
  problem(422, "invalid-transaction", "Invalid Transaction", detail);

/** Digits after the decimal point, trailing zeros aside. */
const decimalPlaces = (amount: string) => (amount.split(".")[1] ?? "").replace(/0+$/, "").length;

/** The ledger with `transaction` after every one booked on or before its date. */
function inBookingOrder(ledger: AccountTransaction[], transaction: AccountTransaction) {
  const at = ledger.findIndex(({ booking_date }) => booking_date > transaction.booking_date);
  return at === -1
    ? [...ledger, transaction]
    : [...ledger.slice(0, at), transaction, ...ledger.slice(at)];
}

/** The Transaction with its Account, when the caller can see it. */
function findTransaction(
  state: MockState,
  householdId: string,
  transactionId: string,
): { account: Account; transaction: AccountTransaction } | undefined {
  const isMember =
    state.registered && state.households.some(({ household_id }) => household_id === householdId);
  if (!isMember) {
    return undefined;
  }
  for (const account of state.accounts[householdId] ?? []) {
    const transaction = state.transactions[account.account_id]?.find(
      ({ transaction_id }) => transaction_id === transactionId,
    );
    if (transaction !== undefined) {
      return { account, transaction };
    }
  }
  return undefined;
}

function isOpeningBalance(state: MockState, householdId: string, transaction: AccountTransaction) {
  return (state.categories[householdId] ?? []).some(
    ({ category_id, kind, name }) =>
      category_id === transaction.category_id && kind === "INTERNAL" && name === "Opening balance",
  );
}

const invalidTransfer = (reason: string, detail: string) => ({
  ...problem(422, "invalid-transfer", "Invalid Transfer", detail),
  reason,
});

/**
 * Records a cash Transaction that is a Transfer leg, as the backend's
 * recordCashLeg (ledger/app/cash.go) does: a statement Counterpart gets
 * nothing and the leg stays In transit; a cash Counterpart gets the opposite
 * leg, the two booked in Account ID order and Matched at once. Either
 * Account's start date or closed month refuses it, naming that Account.
 */
function recordLegs(
  state: MockState,
  householdId: string,
  account: Account,
  body: CashTransactionCreation,
): { problem: Problem } | { state: MockState; own: AccountTransaction } {
  const accounts = state.accounts[householdId] ?? [];
  const counterpartId = body.counterpart_account_id;
  if (counterpartId === account.account_id) {
    return {
      problem: invalidTransfer("SAME_ACCOUNT", "The counterpart is the Transaction's own Account."),
    };
  }
  const counterpart = accounts.find(({ account_id }) => account_id === counterpartId);
  if (counterpart === undefined) {
    return {
      problem: invalidTransfer(
        "UNKNOWN_ACCOUNT",
        "The counterpart is not one of the Household's Accounts.",
      ),
    };
  }
  if (counterpart.currency !== account.currency) {
    return {
      problem: invalidTransfer(
        "CURRENCY_MISMATCH",
        "The counterpart has another Account currency.",
      ),
    };
  }
  const category = (state.categories[householdId] ?? []).find(
    ({ kind, name }) => kind === "INTERNAL" && name === "Account transfer",
  );
  if (category === undefined) {
    throw new Error("The mock Household has no Account transfer Category.");
  }
  const places = currencyPlaces(account.currency);
  const amount = body.amount.amount;
  const cashToCash = counterpart.kind === "CASH";
  const matchId = cashToCash ? crypto.randomUUID() : undefined;
  const leg = (on: Account, other: Account, signed: string): AccountTransaction => ({
    transaction_id: crypto.randomUUID(),
    booking_date: body.date,
    transaction_date: body.date,
    description: body.description,
    amount: {
      amount: fromUnits(toUnits(signed, places), places) as Decimal,
      currency: on.currency,
    },
    category_id: category.category_id,
    category_name: category.name,
    counterpart_account_id: other.account_id,
    ...(matchId === undefined ? {} : { match_id: matchId }),
  });
  const negated = amount.startsWith("-") ? amount.slice(1) : `-${amount}`;
  const own = { account, transaction: leg(account, counterpart, amount) };
  const legs = cashToCash
    ? [own, { account: counterpart, transaction: leg(counterpart, account, negated) }].sort(
        (a, b) => (a.account.account_id < b.account.account_id ? -1 : 1),
      )
    : [own];

  let next = state;
  for (const { account: on, transaction } of legs) {
    if (body.date < on.start_date) {
      return { problem: invalidTransaction("The date is before the Account's start date.") };
    }
    const month = monthOf(body.date);
    if (month < on.open_month) {
      return { problem: monthClosed(month, on.open_month, on.account_id) };
    }
    if (decimalPlaces(amount) > places) {
      return {
        problem: invalidTransaction(
          "The amount has more decimal places than the Account currency.",
        ),
      };
    }
    const balance =
      toUnits(on.balance?.amount ?? "0", places) + toUnits(transaction.amount.amount, places);
    next = {
      ...next,
      accounts: {
        ...next.accounts,
        [householdId]: (next.accounts[householdId] ?? []).map((candidate) =>
          candidate.account_id === on.account_id
            ? {
                ...candidate,
                balance: { amount: fromUnits(balance, places) as Decimal, currency: on.currency },
              }
            : candidate,
        ),
      },
      transactions: {
        ...next.transactions,
        [on.account_id]: inBookingOrder(next.transactions[on.account_id] ?? [], transaction),
      },
    };
  }
  return { state: next, own: own.transaction };
}

export function transactionHandlers(db: MockDb) {
  return [
    http.post(
      "/households/{household_id}/accounts/{account_id}/transactions",
      async ({ params, request, response }) => {
        const state = db.read();
        const isMember =
          state.registered &&
          state.households.some(({ household_id }) => household_id === params.household_id);
        const accounts = isMember ? (state.accounts[params.household_id] ?? []) : [];
        const account = accounts.find(({ account_id }) => account_id === params.account_id);
        if (account === undefined) {
          return response(404).json(notFound);
        }
        const respond = async (transaction: AccountTransaction, payee: string | undefined) =>
          response.untyped(
            await withExactAmounts(
              response(201).json({
                ...transaction,
                account_id: account.account_id,
                ...(payee === undefined ? {} : { payee }),
              }),
            ),
          );
        // A replay with the same Idempotency-Key answers with what it recorded.
        const key = request.headers.get("Idempotency-Key") ?? undefined;
        const replayed = key === undefined ? undefined : state.cashRecords?.[key];
        const earlier = state.transactions[replayed?.accountId ?? ""]?.find(
          ({ transaction_id }) => transaction_id === replayed?.transactionId,
        );
        if (replayed !== undefined && earlier !== undefined) {
          return respond(earlier, replayed.payee);
        }

        // The amount is an exact JSON number: read it as text, never as a JS number.
        const body = parseExactJson(
          await new Response(request.body).text(),
        ) as CashTransactionCreation;
        if (body.category_id !== undefined && body.counterpart_account_id !== undefined) {
          return response(422).json({
            ...problem(
              422,
              "invalid-transfer",
              "Invalid Transfer",
              "A Transfer leg is booked against Account transfer: send category_id or counterpart_account_id, not both.",
            ),
            reason: "CATEGORY_AND_TRANSFER",
          });
        }
        if (account.kind !== "CASH") {
          return response(422).json(
            problem(
              422,
              "not-a-cash-account",
              "Not a cash Account",
              "Only a cash Account takes Transactions by hand: a statement Account takes them only from its statements.",
            ),
          );
        }
        const places = currencyPlaces(account.currency);
        if (body.amount.currency !== account.currency) {
          return response(422).json(
            invalidTransaction("The amount must be in the Account currency."),
          );
        }
        if (
          toUnits(body.amount.amount, Math.max(places, decimalPlaces(body.amount.amount))) === 0n
        ) {
          return response(422).json(invalidTransaction("The amount must not be zero."));
        }
        if (body.date > new Date().toISOString().slice(0, 10)) {
          return response(422).json(
            invalidTransaction("The date is after today: planned money belongs to Planning."),
          );
        }
        if (body.counterpart_account_id !== undefined) {
          const legs = recordLegs(state, params.household_id, account, body);
          if ("problem" in legs) {
            return response.untyped(Response.json(legs.problem, { status: legs.problem.status }));
          }
          db.write({
            ...legs.state,
            ...(key === undefined
              ? {}
              : {
                  cashRecords: {
                    ...legs.state.cashRecords,
                    [key]: {
                      accountId: account.account_id,
                      transactionId: legs.own.transaction_id,
                      ...(body.payee === undefined ? {} : { payee: body.payee }),
                    },
                  },
                }),
          });
          return respond(legs.own, body.payee);
        }
        const categories = state.categories[params.household_id] ?? [];
        const isUncategorised = ({ kind, name }: { kind: string; name: string }) =>
          kind === "INTERNAL" && name === "Uncategorised";
        const category =
          body.category_id === undefined
            ? categories.find(isUncategorised)
            : categories.find(({ category_id }) => category_id === body.category_id);
        if (category === undefined) {
          return response(422).json(
            problem(
              422,
              "invalid-category",
              "Invalid Category",
              "The category_id is not one of the Household's Categories.",
            ),
          );
        }
        if (category.kind === "INTERNAL" && !isUncategorised(category)) {
          return response(422).json(
            problem(
              422,
              "internal-category",
              "Internal Category",
              "Internal Categories belong to the system: only Uncategorised can be chosen.",
            ),
          );
        }
        const misdirected = categoryDirection(category, body.amount.amount);
        if (misdirected !== undefined) {
          return response(422).json(misdirected);
        }
        if (body.date < account.start_date) {
          return response(422).json(
            invalidTransaction("The date is before the Account's start date."),
          );
        }
        const month = monthOf(body.date);
        if (month < account.open_month) {
          return response(409).json(monthClosed(month, account.open_month, account.account_id));
        }
        if (decimalPlaces(body.amount.amount) > places) {
          return response(422).json(
            invalidTransaction("The amount has more decimal places than the Account currency."),
          );
        }

        const amount = fromUnits(toUnits(body.amount.amount, places), places) as Decimal;
        const recorded: AccountTransaction = {
          transaction_id: crypto.randomUUID(),
          booking_date: body.date,
          transaction_date: body.date,
          description: body.description,
          amount: { amount, currency: account.currency },
          category_id: category.category_id,
          category_name: category.name,
        };
        const ledger = inBookingOrder(state.transactions[account.account_id] ?? [], recorded);
        const balance = toUnits(account.balance?.amount ?? "0", places) + toUnits(amount, places);
        db.write({
          ...state,
          accounts: {
            ...state.accounts,
            [params.household_id]: accounts.map((candidate) =>
              candidate.account_id === account.account_id
                ? {
                    ...candidate,
                    balance: {
                      amount: fromUnits(balance, places) as Decimal,
                      currency: account.currency,
                    },
                  }
                : candidate,
            ),
          },
          transactions: { ...state.transactions, [account.account_id]: ledger },
          ...(key === undefined
            ? {}
            : {
                cashRecords: {
                  ...state.cashRecords,
                  [key]: {
                    accountId: account.account_id,
                    transactionId: recorded.transaction_id,
                    ...(body.payee === undefined ? {} : { payee: body.payee }),
                  },
                },
              }),
        });
        return respond(recorded, body.payee);
      },
    ),

    http.patch(
      "/households/{household_id}/transactions/{transaction_id}",
      async ({ params, request, response }) => {
        const state = db.read();
        const found = findTransaction(state, params.household_id, params.transaction_id);
        if (found === undefined) {
          return response(404).json(notFound);
        }
        const { account, transaction } = found;
        const { category_id } = await request.json();
        if (transaction.reversal_of_transaction_id !== undefined) {
          return response(422).json(transactionIsAReversal);
        }
        if (isOpeningBalance(state, params.household_id, transaction)) {
          return response(422).json(openingBalanceTransaction);
        }
        if (transaction.counterpart_account_id !== undefined) {
          return response(422).json(
            problem(
              422,
              "transfer-leg",
              "Transfer leg",
              "A Transfer leg's other side is always the Account transfer Category.",
            ),
          );
        }
        if (transaction.reversed_by_transaction_id !== undefined) {
          return response(409).json(
            problem(
              409,
              "transaction-reversed",
              "Transaction reversed",
              "A reversed Transaction keeps its Category.",
            ),
          );
        }
        const category = (state.categories[params.household_id] ?? []).find(
          (candidate) => candidate.category_id === category_id,
        );
        if (category === undefined) {
          return response(422).json(
            problem(
              422,
              "invalid-category",
              "Invalid Category",
              "The category_id is not one of the Household's Categories.",
            ),
          );
        }
        const uncategorised = category.kind === "INTERNAL" && category.name === "Uncategorised";
        if (category.kind === "INTERNAL" && !uncategorised) {
          return response(422).json(
            problem(
              422,
              "internal-category",
              "Internal Category",
              "Internal Categories belong to the system: only Uncategorised can be chosen.",
            ),
          );
        }
        // In a closed month too.
        const misdirected = categoryDirection(category, transaction.amount.amount);
        if (misdirected !== undefined) {
          return response(422).json(misdirected);
        }
        const month = monthOf(transaction.booking_date);
        if (uncategorised && month < account.open_month) {
          return response(422).json(
            problem(
              422,
              "uncategorised-in-closed-month",
              "Uncategorised in a closed month",
              `${monthWords(month)} is closed, so its Transactions can't go back to Uncategorised. Pick another Category.`,
            ),
          );
        }
        const changed = { ...transaction, category_id, category_name: category.name };
        db.write({
          ...state,
          transactions: {
            ...state.transactions,
            [account.account_id]: (state.transactions[account.account_id] ?? []).map((candidate) =>
              candidate.transaction_id === changed.transaction_id ? changed : candidate,
            ),
          },
        });
        return response.untyped(
          await withExactAmounts(
            response(200).json({ ...changed, account_id: account.account_id }),
          ),
        );
      },
    ),

    http.post(
      "/households/{household_id}/transactions/{transaction_id}/reverse",
      async ({ params, response }) => {
        const state = db.read();
        const found = findTransaction(state, params.household_id, params.transaction_id);
        if (found === undefined) {
          return response(404).json(notFound);
        }
        const { account, transaction } = found;
        if (transaction.reversal_of_transaction_id !== undefined) {
          return response(422).json(transactionIsAReversal);
        }
        if (isOpeningBalance(state, params.household_id, transaction)) {
          return response(422).json(openingBalanceTransaction);
        }
        if (transaction.reversed_by_transaction_id !== undefined) {
          return response(409).json(
            problem(
              409,
              "transaction-already-reversed",
              "Transaction already reversed",
              "The Transaction is already reversed.",
            ),
          );
        }
        const month = monthOf(transaction.booking_date);
        if (month < account.open_month) {
          return response(409).json(monthClosed(month, account.open_month));
        }
        const amount = transaction.amount.amount;
        const reversal: AccountTransaction = {
          transaction_id: crypto.randomUUID(),
          booking_date: transaction.booking_date,
          transaction_date: transaction.transaction_date,
          description: transaction.description,
          amount: {
            ...transaction.amount,
            amount: (amount.startsWith("-") ? amount.slice(1) : `-${amount}`) as typeof amount,
          },
          category_id: transaction.category_id,
          category_name: transaction.category_name,
          reversal_of_transaction_id: transaction.transaction_id,
        };
        const reversed = { ...transaction, reversed_by_transaction_id: reversal.transaction_id };
        const ledger = (state.transactions[account.account_id] ?? []).flatMap((candidate) =>
          candidate.transaction_id === transaction.transaction_id
            ? [reversed, reversal]
            : [candidate],
        );
        // An Accepted row's Imported transaction goes back to pending.
        const rows = (state.importedRows?.[account.account_id] ?? []).map((row) => {
          if (row.imported_transaction_id !== transaction.imported_transaction_id) {
            return row;
          }
          const pending = { ...row, state: "PENDING" as const };
          delete pending.transaction_id;
          return pending;
        });
        db.write({
          ...state,
          transactions: { ...state.transactions, [account.account_id]: ledger },
          importedRows: { ...state.importedRows, [account.account_id]: rows },
        });
        return response.untyped(
          await withExactAmounts(
            response(201).json({ ...reversal, account_id: account.account_id }),
          ),
        );
      },
    ),
  ];
}
