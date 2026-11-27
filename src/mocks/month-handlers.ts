// The mock API's months: the list, one month, Month close and Reopen, with the
// backend's rules and its problems word for word
// (../wallet-accountant/internal/ledger/adapters/http/months.go).
import { parseExactJson } from "../api/exact-json";
import type { components, Decimal } from "../api/schema.gen";
import type { MockDb, MockState } from "./db";
import { badRequest, http, withExactAmounts } from "./http";
import {
  acceptedInOpenMonth,
  accountMonth,
  accountMonths,
  addMonth,
  balanceAt,
  dayWords,
  hasEnded,
  monthOf,
  monthWords,
} from "./months";
import { currencyPlaces, fromUnits, toUnits } from "./statement-files";

type Problem = components["schemas"]["Problem"];
type Account = components["schemas"]["Account"];
type MonthCloseProblem = components["schemas"]["MonthCloseProblem"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

function findAccount(db: MockDb, householdId: string, accountId: string) {
  const state = db.read();
  const isMember =
    state.registered && state.households.some(({ household_id }) => household_id === householdId);
  const account = isMember
    ? state.accounts[householdId]?.find(({ account_id }) => account_id === accountId)
    : undefined;
  return account === undefined ? undefined : { state, account };
}

function writeAccount(
  db: MockDb,
  householdId: string,
  changed: Account,
  extra: Partial<MockState>,
) {
  const state = db.read();
  db.write({
    ...state,
    ...extra,
    accounts: {
      ...state.accounts,
      [householdId]: (state.accounts[householdId] ?? []).map((account) =>
        account.account_id === changed.account_id ? changed : account,
      ),
    },
  });
}

const monthPath = "/households/{household_id}/accounts/{account_id}/months/{booking_month}";

/** Whether `value` is a calendar date written YYYY-MM-DD. */
function isDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function monthHandlers(db: MockDb) {
  return [
    http.get(
      "/households/{household_id}/accounts/{account_id}/months",
      async ({ params, response }) => {
        const found = findAccount(db, params.household_id, params.account_id);
        return found === undefined
          ? response(404).json(notFound)
          : response.untyped(
              await withExactAmounts(
                response(200).json({ items: accountMonths(found.state, found.account) }),
              ),
            );
      },
    ),

    http.get(monthPath, async ({ params, response }) => {
      const found = findAccount(db, params.household_id, params.account_id);
      if (found === undefined || params.booking_month < monthOf(found.account.start_date)) {
        return response(404).json(notFound);
      }
      return response.untyped(
        await withExactAmounts(
          response(200).json(accountMonth(found.state, found.account, params.booking_month)),
        ),
      );
    }),

    http.post(`${monthPath}/close`, async ({ params, request, response }) => {
      // The amount is an exact JSON number: read it as text, never as a JS number.
      const { statement_balance, counted_on } = parseExactJson(
        await new Response(request.body).text(),
      ) as {
        statement_balance: { amount: Decimal; currency: string };
        counted_on?: string;
      };
      // The backend's decoder refuses a counted_on that isn't a date before anything else.
      if (counted_on !== undefined && !isDate(counted_on)) {
        return response.untyped(badRequest("Invalid value for: counted_on."));
      }
      const found = findAccount(db, params.household_id, params.account_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      const { state, account } = found;
      const month = params.booking_month;
      const places = currencyPlaces(account.currency);
      const invalid = (detail: string) =>
        response(422).json({
          type: "/problems/invalid-month-close",
          title: "Invalid Month close",
          status: 422,
          detail,
        });
      const conflict = (type: string, title: string, detail: string) =>
        response(409).json({
          type: `/problems/${type}`,
          title,
          status: 409,
          detail,
          booking_month: month,
          open_month: account.open_month,
        });
      if (statement_balance.currency !== account.currency) {
        return invalid("The Statement balance must be in the Account currency.");
      }
      const cash = account.kind === "CASH";
      const invalidClosing = (detail: string) =>
        response(400).json({
          type: "/problems/invalid-month-closing",
          title: "Invalid Month closing",
          status: 400,
          detail,
        });
      if (cash && counted_on === undefined) {
        return invalidClosing(
          "A cash month closes by a Cash count: send counted_on, the day the cash was counted.",
        );
      }
      if (!cash && counted_on !== undefined) {
        return invalidClosing(
          "Only a cash Account's month closes by a count: leave out counted_on.",
        );
      }
      const [, fraction = ""] = statement_balance.amount.split(".");
      if (fraction.replace(/0+$/, "").length > places) {
        return invalid("The Statement balance has more decimal places than the Account currency.");
      }
      if (month < monthOf(account.start_date)) {
        return invalid("The month is before the Account's start date.");
      }
      if (account.awaiting_first_statement_import) {
        return response(409).json({
          type: "/problems/account-awaiting-first-statement-import",
          title: "Account awaiting its first Statement import",
          status: 409,
          detail: "The Account has no balance until its first Statement import is confirmed.",
        });
      }
      if (month < account.open_month) {
        return conflict(
          "month-already-closed",
          "Month already closed",
          `${monthWords(month)} is already closed; its Statement balance is kept.`,
        );
      }
      if (month > account.open_month) {
        return conflict(
          "month-not-open-yet",
          "Month not open yet",
          `${monthWords(month)} isn't open yet. Close ${monthWords(account.open_month)} first.`,
        );
      }
      if (!hasEnded(month)) {
        return conflict(
          "month-not-ended",
          "Month not ended",
          `${monthWords(month)} can be closed from ${dayWords(addMonth(month, 1))}.`,
        );
      }

      if (
        counted_on !== undefined &&
        (monthOf(counted_on) <= month || counted_on > new Date().toISOString().slice(0, 10))
      ) {
        return response(422).json({
          type: "/problems/invalid-count-date",
          title: "Invalid count date",
          status: 422,
          detail: `The cash must be counted after ${monthWords(month)} ends, and no later than today.`,
        });
      }

      const status = accountMonth(state, account, month);
      const monthEnd = toUnits(status.computed_balance?.amount ?? "0", places);
      // A Cash count is compared with the books at the end of the day it was taken.
      const computed = counted_on === undefined ? monthEnd : balanceAt(state, account, counted_on);
      const statement = toUnits(statement_balance.amount, places);
      const money = (units: bigint) => ({
        amount: fromUnits(units, places) as typeof statement_balance.amount,
        currency: account.currency,
      });
      const problem: MonthCloseProblem = {
        type: "/problems/month-close-refused",
        title: "Month can't close",
        status: 422,
        reasons: [],
      };
      const parts: string[] = [];
      const reasons: string[] = [];
      if (status.pending > 0) {
        reasons.push("PENDING");
        problem.pending = status.pending;
        parts.push(`${String(status.pending)} pending`);
      }
      if (status.suspected_duplicates > 0) {
        reasons.push("SUSPECTED_DUPLICATES");
        problem.suspected_duplicates = status.suspected_duplicates;
        parts.push(`${String(status.suspected_duplicates)} undecided suspected duplicates`);
      }
      if (status.uncategorised > 0) {
        reasons.push("UNCATEGORISED");
        problem.uncategorised = status.uncategorised;
        parts.push(`${String(status.uncategorised)} uncategorised`);
      }
      if (status.unchecked_statement_imports.length > 0) {
        reasons.push("BALANCE_CHECK_NOT_PASSED");
        problem.unchecked_statement_imports = status.unchecked_statement_imports;
        for (const item of status.unchecked_statement_imports) {
          parts.push(
            `statement import ${item.statement_import_id} balance check ${item.balance_check}`,
          );
        }
      }
      if (computed !== statement) {
        reasons.push("BALANCE_MISMATCH");
        problem.computed_balance = money(computed);
        problem.statement_balance = money(statement);
        problem.difference = money(statement - computed);
        parts.push(
          `computed balance ${fromUnits(computed, places)}, statement balance ${fromUnits(statement, places)}, difference ${fromUnits(statement - computed, places)}`,
        );
      }
      if (reasons.length > 0) {
        problem.reasons = reasons;
        problem.detail = `month close refused: ${parts.join("; ")}`;
        return response.untyped(await withExactAmounts(response(422).json(problem)));
      }

      const closedAt = new Date().toISOString();
      writeAccount(
        db,
        params.household_id,
        { ...account, open_month: addMonth(month, 1) },
        {
          monthCloses: {
            ...state.monthCloses,
            [account.account_id]: {
              ...state.monthCloses?.[account.account_id],
              // A cash month keeps the month-end balance its count proves.
              [month]:
                counted_on === undefined
                  ? { statement_balance: money(statement), closed_at: closedAt }
                  : { statement_balance: money(monthEnd), closed_at: closedAt, counted_on },
            },
          },
        },
      );
      const after = findAccount(db, params.household_id, params.account_id);
      return response.untyped(
        await withExactAmounts(
          response(200).json(
            after === undefined ? status : accountMonth(after.state, after.account, month),
          ),
        ),
      );
    }),

    http.post(`${monthPath}/reopen`, async ({ params, response }) => {
      const found = findAccount(db, params.household_id, params.account_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      const { state, account } = found;
      const month = params.booking_month;
      const latestClosed = addMonth(account.open_month, -1);
      const closed = month < account.open_month && month >= monthOf(account.start_date);
      const accepted = acceptedInOpenMonth(state, account);
      const reasons: string[] = [];
      const sentences: string[] = [];
      if (!closed) {
        reasons.push("NOT_CLOSED");
        sentences.push(`${monthWords(month)} isn't closed, so it can't be reopened.`);
      } else if (month !== latestClosed) {
        reasons.push("NOT_LATEST_CLOSED");
        sentences.push(
          `Only ${monthWords(latestClosed)}, the latest closed month, can be reopened.`,
        );
      }
      if (accepted > 0) {
        reasons.push("OPEN_MONTH_HAS_ACCEPTED_TRANSACTIONS");
        const [transactions, them] =
          accepted === 1 ? ["Accepted Transaction", "it"] : ["Accepted Transactions", "them"];
        sentences.push(
          `${monthWords(account.open_month)} has ${String(accepted)} ${transactions}. Reverse ${them} before reopening ${monthWords(month)}.`,
        );
      }
      if (reasons.length > 0) {
        return response(409).json({
          type: "/problems/month-reopen-refused",
          title: "Month can't be reopened",
          status: 409,
          detail: sentences.join(" "),
          reasons,
          booking_month: month,
          open_month: account.open_month,
          ...(accepted > 0 ? { accepted } : {}),
        });
      }
      const closes = Object.fromEntries(
        Object.entries(state.monthCloses?.[account.account_id] ?? {}).filter(
          ([key]) => key !== month,
        ),
      );
      writeAccount(
        db,
        params.household_id,
        { ...account, open_month: month },
        { monthCloses: { ...state.monthCloses, [account.account_id]: closes } },
      );
      const after = findAccount(db, params.household_id, params.account_id);
      return response.untyped(
        await withExactAmounts(
          response(200).json(
            after === undefined
              ? accountMonth(state, account, month)
              : accountMonth(after.state, after.account, month),
          ),
        ),
      );
    }),
  ];
}
