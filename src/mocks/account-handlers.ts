// The mock API's cash Account Opening count: its check, shared with Add
// Account, and Correct opening count (`recountOpening`), with the backend's
// rules and problems word for word
// (../wallet-accountant/internal/ledger/adapters/http/accounts.go, app/cash.go).
import { parseExactJson } from "../api/exact-json";
import type { components, Decimal } from "../api/schema.gen";
import type { MockDb, MockState } from "./db";
import { http, withExactAmounts } from "./http";
import { monthOf, withCounts } from "./months";
import { currencyPlaces, fromUnits, toUnits } from "./statement-files";

type Account = components["schemas"]["Account"];
type AccountTransaction = components["schemas"]["AccountTransaction"];
type Money = components["schemas"]["Money"];
type OpeningRecount = components["schemas"]["OpeningRecount"];
type Problem = components["schemas"]["Problem"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

const invalidAccount = (detail: string): Problem => ({
  type: "/problems/invalid-account",
  title: "Invalid Account",
  status: 422,
  detail,
});

/** Digits after the decimal point, trailing zeros aside. */
const decimalPlaces = (amount: string) => (amount.split(".")[1] ?? "").replace(/0+$/, "").length;

/**
 * A cash Account's Opening count, typed twice: the count in the currency's
 * places, or the 422 problem the backend answers.
 */
export function checkOpeningCount(
  currency: string,
  count: Money | undefined,
  again: Money | undefined,
): { count: Money } | { problem: Problem } {
  if (count === undefined || again === undefined) {
    return {
      problem: invalidAccount("A cash Account needs opening_count and opening_count_confirmation."),
    };
  }
  if (count.currency !== currency || again.currency !== currency) {
    return { problem: invalidAccount("The Opening count must be in the Account currency.") };
  }
  const places = currencyPlaces(currency);
  if ([count, again].some(({ amount }) => decimalPlaces(amount) > places)) {
    return {
      problem: invalidAccount(
        "The Opening count has more decimal places than the Account currency.",
      ),
    };
  }
  if (toUnits(count.amount, places) !== toUnits(again.amount, places)) {
    return {
      problem: {
        type: "/problems/opening-count-mismatch",
        title: "Opening counts differ",
        status: 422,
        detail: "The Opening count and its confirmation differ: count the cash again.",
      },
    };
  }
  return {
    count: { amount: fromUnits(toUnits(count.amount, places), places) as Decimal, currency },
  };
}

/** The Household's Opening balance Category. */
const openingCategory = (state: MockState, householdId: string) =>
  (state.categories[householdId] ?? []).find(
    ({ kind, name }) => kind === "INTERNAL" && name === "Opening balance",
  );

/** A cash Account's Opening balance Transaction, on its start date. */
export function openingBalanceTransaction(
  state: MockState,
  householdId: string,
  startDate: string,
  amount: Money,
): AccountTransaction | undefined {
  const category = openingCategory(state, householdId);
  return category === undefined
    ? undefined
    : {
        transaction_id: crypto.randomUUID(),
        booking_date: startDate,
        transaction_date: startDate,
        description: "Opening balance",
        amount,
        category_id: category.category_id,
        category_name: category.name,
      };
}

export function accountHandlers(db: MockDb) {
  return [
    http.post(
      "/households/{household_id}/accounts/{account_id}/opening-count",
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
        if (account.kind !== "CASH") {
          return response(422).json({
            type: "/problems/not-a-cash-account",
            title: "Not a cash Account",
            status: 422,
            detail:
              "Only a cash Account has an Opening count: a statement Account's Opening balance comes from its first Statement import.",
          });
        }
        // The counts are exact JSON numbers: read them as text, never as JS numbers.
        const body = parseExactJson(await new Response(request.body).text()) as OpeningRecount;
        const checked = checkOpeningCount(
          account.currency,
          body.opening_count,
          body.opening_count_confirmation,
        );
        if ("problem" in checked) {
          return response(422).json(checked.problem);
        }
        if (monthOf(account.start_date) < account.open_month) {
          return response(409).json({
            type: "/problems/opening-count-locked",
            title: "Opening count locked",
            status: 409,
            detail:
              "The start date's month has closed, so the Opening count can't change. Reopen back to it first.",
          });
        }

        const respond = async (answer: Account) =>
          response.untyped(
            await withExactAmounts(response(200).json(withCounts(db.read(), answer))),
          );
        const ledger = state.transactions[account.account_id] ?? [];
        const categoryId = openingCategory(state, params.household_id)?.category_id;
        const current = ledger.find(
          (transaction) =>
            transaction.category_id === categoryId &&
            transaction.reversal_of_transaction_id === undefined &&
            transaction.reversed_by_transaction_id === undefined,
        );
        const places = currencyPlaces(account.currency);
        // The same count again records nothing.
        if (
          current !== undefined &&
          toUnits(current.amount.amount, places) === toUnits(checked.count.amount, places)
        ) {
          return respond(account);
        }
        const recorded = openingBalanceTransaction(
          state,
          params.household_id,
          account.start_date,
          checked.count,
        );
        if (recorded === undefined) {
          return response(404).json(notFound);
        }
        // The current one is reversed, linked to its reversal, and the new one follows it.
        let next = [...ledger, recorded];
        if (current !== undefined) {
          const reversal: AccountTransaction = {
            ...current,
            transaction_id: crypto.randomUUID(),
            amount: {
              ...current.amount,
              amount: fromUnits(-toUnits(current.amount.amount, places), places) as Decimal,
            },
            reversal_of_transaction_id: current.transaction_id,
          };
          const reversed = { ...current, reversed_by_transaction_id: reversal.transaction_id };
          next = ledger.flatMap((transaction) =>
            transaction.transaction_id === current.transaction_id
              ? [reversed, reversal, recorded]
              : [transaction],
          );
        }
        const balance = next.reduce((sum, { amount }) => sum + toUnits(amount.amount, places), 0n);
        const recounted: Account = {
          ...account,
          balance: { amount: fromUnits(balance, places) as Decimal, currency: account.currency },
        };
        db.write({
          ...state,
          accounts: {
            ...state.accounts,
            [params.household_id]: accounts.map((candidate) =>
              candidate.account_id === account.account_id ? recounted : candidate,
            ),
          },
          transactions: { ...state.transactions, [account.account_id]: next },
        });
        return respond(recounted);
      },
    ),
  ];
}
