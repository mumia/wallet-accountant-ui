// The mock API's Imported transactions (the list, Accept, Accept as Transfer,
// Transfer suggestions, Keep and Discard) and Notifications (the list, mark
// read), with the backend's rules and its problems word for word
// (../wallet-accountant/internal/ingestion/adapters/http/importedtransactions.go,
// suggestions.go, and internal/ledger/app/transfers.go).
import type { components, Decimal } from "../api/schema.gen";
import { categoryDirection } from "./category-direction";
import type { ImportedRow, MockDb, MockState } from "./db";
import { http, withExactAmounts } from "./http";
import { monthOf, monthWords } from "./months";
import { currencyPlaces, fromUnits, toUnits } from "./statement-files";

type Problem = components["schemas"]["Problem"];
type ImportedTransaction = components["schemas"]["ImportedTransaction"];
type AccountTransaction = components["schemas"]["AccountTransaction"];
type Account = components["schemas"]["Account"];
type Transaction = components["schemas"]["Transaction"];
type TransferProblem = components["schemas"]["TransferProblem"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

const conflict = (type: string, title: string, detail: string): Problem => ({
  type: `/problems/${type}`,
  title,
  status: 409,
  detail,
});

const isMember = (state: MockState, householdId: string) =>
  state.registered && state.households.some(({ household_id }) => household_id === householdId);

/** The row as the API shows it, with the row it resembles as that row is now. */
function shown(row: ImportedRow, all: readonly ImportedRow[]): ImportedTransaction {
  const { resembles_id, ...rest } = row;
  const resembled = all.find(
    ({ imported_transaction_id }) => imported_transaction_id === resembles_id,
  );
  return resembled === undefined
    ? rest
    : {
        ...rest,
        resembles: {
          imported_transaction_id: resembled.imported_transaction_id,
          statement_import_id: resembled.statement_import_id,
          state: resembled.state,
          booking_date: resembled.booking_date,
          amount: resembled.amount,
          description: resembled.description,
          ...(resembled.bank_transaction_id === undefined
            ? {}
            : { bank_transaction_id: resembled.bank_transaction_id }),
        },
      };
}

interface Found {
  state: MockState;
  accountId: string;
  row: ImportedRow;
}

function findRow(db: MockDb, householdId: string, rowId: string): Found | undefined {
  const state = db.read();
  if (!isMember(state, householdId)) {
    return undefined;
  }
  for (const { account_id: accountId } of state.accounts[householdId] ?? []) {
    const row = state.importedRows?.[accountId]?.find(
      ({ imported_transaction_id }) => imported_transaction_id === rowId,
    );
    if (row !== undefined) {
      return { state, accountId, row };
    }
  }
  return undefined;
}

/**
 * Writes the changed row into the state as it is now (requests run at once, so
 * an earlier read may be stale). When its Statement import has no Suspected
 * duplicate left, a waiting Balance check is run: the mock passes it.
 */
function save(
  db: MockDb,
  accountId: string,
  changed: ImportedRow,
  extra: (state: MockState) => Partial<MockState> = () => ({}),
) {
  const state = db.read();
  const rows = (state.importedRows?.[accountId] ?? []).map((row) =>
    row.imported_transaction_id === changed.imported_transaction_id ? changed : row,
  );
  const waiting = rows.some(
    (row) =>
      row.statement_import_id === changed.statement_import_id &&
      row.state === "SUSPECTED_DUPLICATE",
  );
  const imports = Object.fromEntries(
    Object.entries(state.statementImports ?? {}).map(([connectionId, items]) => [
      connectionId,
      items.map((item) =>
        item.statement_import_id === changed.statement_import_id &&
        item.balance_check === "WAITING" &&
        !waiting
          ? { ...item, balance_check: "PASSED" }
          : item,
      ),
    ]),
  );
  db.write({
    ...state,
    ...extra(state),
    statementImports: imports,
    importedRows: { ...state.importedRows, [accountId]: rows },
  });
  return shown(changed, rows);
}

/** The 409 of a row booked in a closed month, or (`notOpen`) in one not open yet. */
function monthRefusal(state: MockState, accountId: string, row: ImportedRow, notOpen: boolean) {
  const account = Object.values(state.accounts)
    .flat()
    .find(({ account_id }) => account_id === accountId);
  if (account === undefined) {
    return undefined;
  }
  const month = monthOf(row.booking_date);
  if (month < account.open_month) {
    return {
      type: "/problems/month-closed",
      title: "Month closed",
      status: 409,
      detail: `${monthWords(month)} is closed. Reopen it to change its entries.`,
      booking_month: month,
      open_month: account.open_month,
    };
  }
  if (notOpen && month > account.open_month) {
    return {
      type: "/problems/month-not-open-yet",
      title: "Month not open yet",
      status: 409,
      detail: `${monthWords(month)} isn't open yet. Close ${monthWords(account.open_month)} first.`,
      booking_month: month,
      open_month: account.open_month,
    };
  }
  return undefined;
}

/** Why the backend refuses each Accept as Transfer, word for word. */
const transferDetails = {
  CATEGORY_AND_TRANSFER:
    "A Transfer leg is booked against Account transfer: send category_id or transfer_account_id, not both.",
  COUNTERPART_NOT_CASH:
    "transfer_account_id must be a cash Account: Transfers between statement Accounts come later.",
  MATCH_WITHOUT_TRANSFER:
    "match_transaction_id needs transfer_account_id, the cash Account it is on.",
  NOT_A_MATCHING_LEG:
    "match_transaction_id isn't an In transit leg on the cash Account naming this row's Account with the opposite amount.",
  SAME_ACCOUNT: "transfer_account_id is the row's own Account.",
  CURRENCY_MISMATCH: "transfer_account_id has another Account currency than the row.",
  UNKNOWN_ACCOUNT: "transfer_account_id is not one of the Household's Accounts.",
} as const;

const transferRefused = (reason: keyof typeof transferDetails): TransferProblem => ({
  type: "/problems/invalid-transfer",
  title: "Invalid Transfer",
  status: 422,
  detail: transferDetails[reason],
  reason,
});

/** How far either side of a row's Transaction date a cash leg is suggested, in days. */
const suggestionWindow = 7;

const daysBetween = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;

const negate = (amount: string, currency: string) => {
  const places = currencyPlaces(currency);
  return fromUnits(-toUnits(amount, places), places) as Decimal;
};

const sameAmount = (a: string, b: string, currency: string) => {
  const places = currencyPlaces(currency);
  return toUnits(a, places) === toUnits(b, places);
};

/**
 * The backend's checkCashCounterpart: for a row on `rowAccount`, the cash
 * Account must be another of the Household's Accounts, a cash one, in the
 * row's currency.
 */
function cashCounterpart(
  state: MockState,
  householdId: string,
  rowAccount: string,
  cashId: string,
  currency: string,
): { refused: TransferProblem } | { cash: Account } {
  if (cashId === rowAccount) {
    return { refused: transferRefused("SAME_ACCOUNT") };
  }
  const cash = (state.accounts[householdId] ?? []).find(({ account_id }) => account_id === cashId);
  if (cash === undefined) {
    return { refused: transferRefused("UNKNOWN_ACCOUNT") };
  }
  if (cash.kind !== "CASH") {
    return { refused: transferRefused("COUNTERPART_NOT_CASH") };
  }
  if (cash.currency !== currency) {
    return { refused: transferRefused("CURRENCY_MISMATCH") };
  }
  return { cash };
}

/** A leg on the cash Account that could be the row's other side, the date window aside. */
const couldMatch = (leg: AccountTransaction, rowAccount: string, row: ImportedRow) =>
  leg.counterpart_account_id === rowAccount &&
  leg.match_id === undefined &&
  leg.reversed_by_transaction_id === undefined &&
  leg.reversal_of_transaction_id === undefined &&
  leg.amount.currency === row.amount.currency &&
  sameAmount(
    leg.amount.amount,
    negate(row.amount.amount, row.amount.currency),
    row.amount.currency,
  );

/**
 * The backend's BookTransfer: the cash Account checked, then either the given
 * leg checked as one to Match, or the cash leg's month checked (its date is
 * the row's Transaction date); then the bank leg recorded against Account
 * transfer, the cash leg recorded (`created_by_transfer`) or the given one
 * taken, and the two Matched.
 */
function bookTransfer(
  state: MockState,
  householdId: string,
  rowAccount: string,
  row: ImportedRow,
  cashId: string,
  matchLegId: string | undefined,
):
  | { refused: TransferProblem | ReturnType<typeof cashMonthClosed> }
  | {
      bankLeg: string;
      changes: (now: MockState) => Partial<MockState>;
    } {
  const checked = cashCounterpart(state, householdId, rowAccount, cashId, row.amount.currency);
  if ("refused" in checked) {
    return checked;
  }
  const cash = checked.cash;
  const cashLedger = state.transactions[cash.account_id] ?? [];
  if (matchLegId !== undefined) {
    const leg = cashLedger.find(({ transaction_id }) => transaction_id === matchLegId);
    // No date window here (backend spec, "Accept as Transfer").
    if (leg === undefined || !couldMatch(leg, rowAccount, row)) {
      return { refused: transferRefused("NOT_A_MATCHING_LEG") };
    }
  } else if (monthOf(row.transaction_date) < cash.open_month) {
    return { refused: cashMonthClosed(monthOf(row.transaction_date), cash) };
  }
  const transferCategory = (state.categories[householdId] ?? []).find(
    ({ kind, name }) => kind === "INTERNAL" && name === "Account transfer",
  );
  if (transferCategory === undefined) {
    throw new Error("The mock Household has no Account transfer Category.");
  }
  const matchId = crypto.randomUUID();
  const against = {
    category_id: transferCategory.category_id,
    category_name: transferCategory.name,
    match_id: matchId,
  };
  const bankLeg: AccountTransaction = {
    transaction_id: crypto.randomUUID(),
    booking_date: row.booking_date,
    transaction_date: row.transaction_date,
    description: row.description,
    amount: row.amount,
    imported_transaction_id: row.imported_transaction_id,
    counterpart_account_id: cash.account_id,
    ...against,
  };
  const cashAmount = negate(row.amount.amount, row.amount.currency);
  const cashLeg: AccountTransaction | undefined =
    matchLegId === undefined
      ? {
          transaction_id: crypto.randomUUID(),
          booking_date: row.transaction_date,
          transaction_date: row.transaction_date,
          description: row.description,
          amount: { amount: cashAmount, currency: cash.currency },
          counterpart_account_id: rowAccount,
          created_by_transfer: true,
          ...against,
        }
      : undefined;
  const changes = (now: MockState): Partial<MockState> => {
    const nowCash = now.transactions[cash.account_id] ?? [];
    const cashTransactions =
      cashLeg === undefined
        ? nowCash.map((leg) =>
            leg.transaction_id === matchLegId ? { ...leg, match_id: matchId } : leg,
          )
        : [...nowCash, cashLeg].sort((a, b) => a.booking_date.localeCompare(b.booking_date));
    const places = currencyPlaces(cash.currency);
    return {
      transactions: {
        ...now.transactions,
        [rowAccount]: [...(now.transactions[rowAccount] ?? []), bankLeg].sort((a, b) =>
          a.booking_date.localeCompare(b.booking_date),
        ),
        [cash.account_id]: cashTransactions,
      },
      // A new cash leg moves the cash Account's balance.
      ...(cashLeg === undefined
        ? {}
        : {
            accounts: {
              ...now.accounts,
              [householdId]: (now.accounts[householdId] ?? []).map((account) =>
                account.account_id === cash.account_id
                  ? {
                      ...account,
                      balance: {
                        amount: fromUnits(
                          toUnits(account.balance?.amount ?? "0", places) +
                            toUnits(cashAmount, places),
                          places,
                        ) as Decimal,
                        currency: account.currency,
                      },
                    }
                  : account,
              ),
            },
          }),
    };
  };
  return { bankLeg: bankLeg.transaction_id, changes };
}

/** The 409 of a cash leg dated in a closed month of the cash Account, naming it. */
function cashMonthClosed(month: string, cash: Account) {
  return {
    type: "/problems/month-closed",
    title: "Month closed",
    status: 409,
    detail: `${monthWords(month)} is closed. Reopen it to change its entries.`,
    booking_month: month,
    open_month: cash.open_month,
    account_id: cash.account_id,
  };
}

const rowPath = "/households/{household_id}/imported-transactions/{imported_transaction_id}";

export function importedTransactionHandlers(db: MockDb) {
  return [
    http.get(
      "/households/{household_id}/accounts/{account_id}/imported-transactions",
      async ({ params, query, response }) => {
        const state = db.read();
        const account = isMember(state, params.household_id)
          ? state.accounts[params.household_id]?.find(
              ({ account_id }) => account_id === params.account_id,
            )
          : undefined;
        if (account === undefined) {
          return response(404).json(notFound);
        }
        const all = state.importedRows?.[params.account_id] ?? [];
        const wanted = query.get("state");
        const month = query.get("booking_month");
        const matching = all
          .filter(
            (row) =>
              (wanted === null || row.state === wanted) &&
              (month === null || row.booking_date.startsWith(month)),
          )
          // Booking date, then the order they were imported (the API's order).
          .map((row, index) => ({ row, index }))
          .sort((a, b) => a.row.booking_date.localeCompare(b.row.booking_date) || a.index - b.index)
          .map(({ row }) => shown(row, all));
        const start = Number(query.get("cursor") ?? "0");
        const limit = Math.min(Number(query.get("limit") ?? "50"), 200);
        const items = matching.slice(start, start + limit);
        const next = start + limit < matching.length ? String(start + limit) : undefined;
        return response.untyped(
          await withExactAmounts(
            response(200).json({ items, ...(next === undefined ? {} : { next_cursor: next }) }),
          ),
        );
      },
    ),

    http.post(`${rowPath}/accept`, async ({ params, request, response }) => {
      // The body is optional: no body means Uncategorised.
      const text = await new Response(request.body).text();
      const body =
        text === ""
          ? {}
          : (JSON.parse(text) as components["schemas"]["ImportedTransactionAcceptance"]);
      if (body.category_id !== undefined && body.transfer_account_id !== undefined) {
        return response(422).json(transferRefused("CATEGORY_AND_TRANSFER"));
      }
      if (body.match_transaction_id !== undefined && body.transfer_account_id === undefined) {
        return response(422).json(transferRefused("MATCH_WITHOUT_TRANSFER"));
      }
      const found = findRow(db, params.household_id, params.imported_transaction_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      const { row, state, accountId } = found;
      if (row.state === "ACCEPTED") {
        return response(409).json(
          conflict(
            "imported-transaction-already-accepted",
            "Imported transaction already Accepted",
            "The Imported transaction is already booked in the Ledger.",
          ),
        );
      }
      if (row.state === "DISCARDED") {
        return response(409).json(
          conflict(
            "imported-transaction-discarded",
            "Imported transaction Discarded",
            "The Imported transaction is Discarded, which is final.",
          ),
        );
      }
      if (row.state === "SUSPECTED_DUPLICATE") {
        return response(409).json(
          conflict(
            "imported-transaction-suspected-duplicate",
            "Imported transaction is a Suspected duplicate",
            "Keep the Suspected duplicate before accepting it, or Discard it.",
          ),
        );
      }
      const refusedForMonth = monthRefusal(state, accountId, row, true);
      if (refusedForMonth !== undefined) {
        return response(409).json(refusedForMonth);
      }
      if (body.transfer_account_id !== undefined) {
        const booked = bookTransfer(
          state,
          params.household_id,
          accountId,
          row,
          body.transfer_account_id,
          body.match_transaction_id,
        );
        if ("refused" in booked) {
          return response.untyped(Response.json(booked.refused, { status: booked.refused.status }));
        }
        const accepted = save(
          db,
          accountId,
          { ...row, state: "ACCEPTED", transaction_id: booked.bankLeg },
          booked.changes,
        );
        return response.untyped(await withExactAmounts(response(200).json(accepted)));
      }
      const categories = state.categories[params.household_id] ?? [];
      const category =
        body.category_id === undefined
          ? categories.find(({ kind, name }) => kind === "INTERNAL" && name === "Uncategorised")
          : categories.find(({ category_id }) => category_id === body.category_id);
      if (category === undefined) {
        return response(422).json({
          type: "/problems/invalid-category",
          title: "Invalid Category",
          status: 422,
          detail: "The category_id is not one of the Household's Categories.",
        });
      }
      if (category.kind === "INTERNAL" && category.name !== "Uncategorised") {
        return response(422).json({
          type: "/problems/internal-category",
          title: "Internal Category",
          status: 422,
          detail:
            "Internal Categories belong to the system: only Uncategorised can be chosen when accepting.",
        });
      }
      const misdirected = categoryDirection(category, row.amount.amount);
      if (misdirected !== undefined) {
        return response(422).json(misdirected);
      }
      const transaction: AccountTransaction = {
        transaction_id: crypto.randomUUID(),
        booking_date: row.booking_date,
        transaction_date: row.transaction_date,
        description: row.description,
        amount: row.amount,
        category_id: category.category_id,
        category_name: category.name,
        imported_transaction_id: row.imported_transaction_id,
      };
      const accepted = save(
        db,
        accountId,
        { ...row, state: "ACCEPTED", transaction_id: transaction.transaction_id },
        (now) => ({
          transactions: {
            ...now.transactions,
            [accountId]: [...(now.transactions[accountId] ?? []), transaction].sort((a, b) =>
              a.booking_date.localeCompare(b.booking_date),
            ),
          },
        }),
      );
      return response.untyped(await withExactAmounts(response(200).json(accepted)));
    }),

    http.get(`${rowPath}/transfer-suggestions`, async ({ params, query, response }) => {
      const found = findRow(db, params.household_id, params.imported_transaction_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      const { state, accountId, row } = found;
      const checked = cashCounterpart(
        state,
        params.household_id,
        accountId,
        query.get("account_id"),
        row.amount.currency,
      );
      if ("refused" in checked) {
        return response(422).json(checked.refused);
      }
      const cash = checked.cash;
      const items: Transaction[] = (state.transactions[cash.account_id] ?? [])
        .filter(
          (leg) =>
            couldMatch(leg, accountId, row) &&
            daysBetween(leg.transaction_date, row.transaction_date) <= suggestionWindow,
        )
        // Closest first, then by date, then by ID, as the backend orders them.
        .sort(
          (a, b) =>
            daysBetween(a.transaction_date, row.transaction_date) -
              daysBetween(b.transaction_date, row.transaction_date) ||
            a.transaction_date.localeCompare(b.transaction_date) ||
            a.transaction_id.localeCompare(b.transaction_id),
        )
        .map((leg) => ({
          transaction_id: leg.transaction_id,
          account_id: cash.account_id,
          amount: leg.amount,
          booking_date: leg.booking_date,
          transaction_date: leg.transaction_date,
          description: leg.description,
          category_id: leg.category_id,
          category_name: leg.category_name,
          counterpart_account_id: accountId,
        }));
      return response.untyped(await withExactAmounts(response(200).json({ items })));
    }),

    http.post(`${rowPath}/keep`, async ({ params, response }) => {
      const found = findRow(db, params.household_id, params.imported_transaction_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      if (found.row.state !== "SUSPECTED_DUPLICATE") {
        return response(409).json(
          conflict(
            "imported-transaction-not-suspected-duplicate",
            "Not a Suspected duplicate",
            "Only a Suspected duplicate can be kept.",
          ),
        );
      }
      // A Suspected duplicate in a month not open yet can still be kept.
      const refusedForMonth = monthRefusal(found.state, found.accountId, found.row, false);
      if (refusedForMonth !== undefined) {
        return response(409).json(refusedForMonth);
      }
      const kept = save(db, found.accountId, { ...found.row, state: "PENDING" });
      return response.untyped(await withExactAmounts(response(200).json(kept)));
    }),

    http.post(`${rowPath}/discard`, async ({ params, response }) => {
      const found = findRow(db, params.household_id, params.imported_transaction_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      if (found.row.state === "DISCARDED") {
        return response(409).json(
          conflict(
            "imported-transaction-already-discarded",
            "Imported transaction already Discarded",
            "The Imported transaction is already Discarded.",
          ),
        );
      }
      if (found.row.state === "ACCEPTED") {
        return response(409).json(
          conflict(
            "imported-transaction-already-accepted",
            "Imported transaction already Accepted",
            "The Imported transaction is booked in the Ledger: reverse its Transaction first.",
          ),
        );
      }
      // A Suspected duplicate in a month not open yet can still be Discarded.
      const refusedForMonth = monthRefusal(
        found.state,
        found.accountId,
        found.row,
        found.row.state === "PENDING",
      );
      if (refusedForMonth !== undefined) {
        return response(409).json(refusedForMonth);
      }
      const discarded = save(db, found.accountId, { ...found.row, state: "DISCARDED" });
      return response.untyped(await withExactAmounts(response(200).json(discarded)));
    }),

    http.get("/households/{household_id}/notifications", ({ params, response }) => {
      const state = db.read();
      return isMember(state, params.household_id)
        ? response(200).json({ items: state.notifications?.[params.household_id] ?? [] })
        : response(404).json(notFound);
    }),

    http.post(
      "/households/{household_id}/notifications/{notification_id}/read",
      ({ params, response }) => {
        const state = db.read();
        const all = state.notifications?.[params.household_id] ?? [];
        const notification = isMember(state, params.household_id)
          ? all.find(({ notification_id }) => notification_id === params.notification_id)
          : undefined;
        if (notification === undefined) {
          return response(404).json(notFound);
        }
        const read = { ...notification, read: true };
        db.write({
          ...state,
          notifications: {
            ...state.notifications,
            [params.household_id]: all.map((item) =>
              item.notification_id === read.notification_id ? read : item,
            ),
          },
        });
        return response(200).json(read);
      },
    ),
  ];
}
