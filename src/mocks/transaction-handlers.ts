// The mock API's corrections of a Transaction: a Category change and Reverse
// (ADR-0018, ADR-0024 in the backend), with the backend's rules and problems
// word for word (../wallet-accountant/internal/ledger/adapters/http/corrections.go).
import type { components } from "../api/schema.gen";
import type { MockDb, MockState } from "./db";
import { http, withExactAmounts } from "./http";
import { monthOf, monthWords } from "./months";

type Problem = components["schemas"]["Problem"];
type AccountTransaction = components["schemas"]["AccountTransaction"];
type Account = components["schemas"]["Account"];

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

function monthClosed(month: string, openMonth: string) {
  return {
    type: "/problems/month-closed",
    title: "Month closed",
    status: 409,
    detail: `${monthWords(month)} is closed. Reopen it to change its entries.`,
    booking_month: month,
    open_month: openMonth,
  };
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

export function transactionHandlers(db: MockDb) {
  return [
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
