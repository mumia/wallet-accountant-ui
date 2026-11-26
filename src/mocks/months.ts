// The mock API's month rules (ADR-0024 in the backend): one open month per
// Account, closed in order once it has ended; the months before it closed,
// the months after it not open yet. Pure functions over the mock state.
import type { components, Decimal } from "../api/schema.gen";
import type { MockState } from "./db";
import { currencyPlaces, fromUnits, toUnits } from "./statement-files";

type Account = components["schemas"]["Account"];
type AccountMonth = components["schemas"]["AccountMonth"];
type StatementImport = components["schemas"]["StatementImport"];

/** "2026-03" from a date or date-time. */
export const monthOf = (date: string) => date.slice(0, 7);

export function addMonth(month: string, count: number): string {
  const [year = 0, mm = 1] = month.split("-").map(Number);
  const index = year * 12 + (mm - 1) + count;
  return `${String(Math.floor(index / 12))}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** "January 2026", as the backend's problems write a month. */
export function monthWords(month: string): string {
  const [year = 0, mm = 1] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, mm - 1, 1));
}

/** "1 December 2026", as the backend's problems write a date. */
export function dayWords(month: string): string {
  const [year = 0, mm = 1] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    Date.UTC(year, mm - 1, 1),
  );
}

/** Whether the month has ended, by the clock in UTC. */
export function hasEnded(month: string, now: Date = new Date()): boolean {
  const [year = 0, mm = 1] = addMonth(month, 1).split("-").map(Number);
  return now.getTime() >= Date.UTC(year, mm - 1, 1);
}

export function monthState(account: Account, month: string): "OPEN" | "CLOSED" | "NOT_OPEN_YET" {
  return month === account.open_month
    ? "OPEN"
    : month < account.open_month
      ? "CLOSED"
      : "NOT_OPEN_YET";
}

const money = (amount: string, currency: string) => ({ amount: amount as Decimal, currency });

function importsOf(state: MockState, accountId: string): StatementImport[] {
  return Object.values(state.statementImports ?? {})
    .flat()
    .filter((item) => item.account_id === accountId);
}

/** The Account's pending and undecided Suspected duplicate counts, in every month. */
export function withCounts(state: MockState, account: Account): Account {
  const rows = state.importedRows?.[account.account_id] ?? [];
  return {
    ...account,
    pending: rows.filter(({ state: rowState }) => rowState === "PENDING").length,
    suspected_duplicates: rows.filter(({ state: rowState }) => rowState === "SUSPECTED_DUPLICATE")
      .length,
  };
}

/** Accepted Transactions in the open month that aren't reversed: they block a Reopen. */
export function acceptedInOpenMonth(state: MockState, account: Account): number {
  const reversed = new Set(
    (state.transactions[account.account_id] ?? [])
      .filter(({ reversed_by_transaction_id }) => reversed_by_transaction_id !== undefined)
      .map(({ transaction_id }) => transaction_id),
  );
  return (state.importedRows?.[account.account_id] ?? []).filter(
    (row) =>
      row.state === "ACCEPTED" &&
      monthOf(row.booking_date) === account.open_month &&
      (row.transaction_id === undefined || !reversed.has(row.transaction_id)),
  ).length;
}

/** One month as `getAccountMonth` gives it. */
export function accountMonth(state: MockState, account: Account, month: string): AccountMonth {
  const places = currencyPlaces(account.currency);
  const rows = (state.importedRows?.[account.account_id] ?? []).filter(
    ({ booking_date }) => monthOf(booking_date) === month,
  );
  const ledger = state.transactions[account.account_id] ?? [];
  const closed = state.monthCloses?.[account.account_id]?.[month];
  const monthStateNow = monthState(account, month);
  const computed = ledger
    .filter(({ booking_date }) => monthOf(booking_date) <= month)
    .reduce((sum, { amount }) => sum + toUnits(amount.amount, places), 0n);
  const latestClosed = addMonth(account.open_month, -1);
  const rowsUpTo = new Set(
    (state.importedRows?.[account.account_id] ?? [])
      .filter(({ booking_date }) => monthOf(booking_date) <= month)
      .map(({ statement_import_id }) => statement_import_id),
  );
  return {
    account_id: account.account_id,
    booking_month: month,
    state: monthStateNow,
    ...(monthStateNow === "CLOSED" && closed !== undefined
      ? { statement_balance: closed.statement_balance, closed_at: closed.closed_at }
      : {}),
    ...(account.awaiting_first_statement_import
      ? {}
      : { computed_balance: money(fromUnits(computed, places), account.currency) }),
    pending: rows.filter(({ state: rowState }) => rowState === "PENDING").length,
    suspected_duplicates: rows.filter(({ state: rowState }) => rowState === "SUSPECTED_DUPLICATE")
      .length,
    uncategorised: ledger.filter(
      (transaction) =>
        monthOf(transaction.booking_date) === month &&
        transaction.category_name === "Uncategorised" &&
        transaction.reversal_of_transaction_id === undefined &&
        transaction.reversed_by_transaction_id === undefined,
    ).length,
    transfer_legs_in_transit: ledger.filter(
      (transaction) =>
        monthOf(transaction.booking_date) === month &&
        transaction.counterpart_account_id !== undefined &&
        transaction.match_id === undefined &&
        transaction.reversal_of_transaction_id === undefined &&
        transaction.reversed_by_transaction_id === undefined,
    ).length,
    unchecked_statement_imports: importsOf(state, account.account_id)
      .filter(
        (item) =>
          item.voided_at === undefined &&
          item.balance_check !== "PASSED" &&
          rowsUpTo.has(item.statement_import_id),
      )
      .map(({ statement_import_id, balance_check }) => ({ statement_import_id, balance_check })),
    reopen_blocked: !(
      monthStateNow === "CLOSED" &&
      month === latestClosed &&
      acceptedInOpenMonth(state, account) === 0
    ),
  };
}

/**
 * Every month of the Account, newest first: from the start date's month to the
 * later of the current month and the latest month with a non-Discarded row.
 */
export function accountMonths(
  state: MockState,
  account: Account,
  now: Date = new Date(),
): AccountMonth[] {
  const latestRow = (state.importedRows?.[account.account_id] ?? [])
    .filter(({ state: rowState }) => rowState !== "DISCARDED")
    .map(({ booking_date }) => monthOf(booking_date))
    .sort()
    .at(-1);
  const current = monthOf(now.toISOString());
  const last = latestRow !== undefined && latestRow > current ? latestRow : current;
  const months: AccountMonth[] = [];
  for (let month = last; month >= monthOf(account.start_date); month = addMonth(month, -1)) {
    months.push(accountMonth(state, account, month));
  }
  return months;
}

/** Why Void would be refused right now; none for a voided import. */
export function voidBlockedBy(state: MockState, item: StatementImport): string[] {
  if (item.voided_at !== undefined) {
    return [];
  }
  const account = Object.values(state.accounts)
    .flat()
    .find(({ account_id }) => account_id === item.account_id);
  const imports = importsOf(state, item.account_id).filter(
    ({ voided_at }) => voided_at === undefined,
  );
  const rows = (state.importedRows?.[item.account_id] ?? []).filter(
    ({ statement_import_id }) => statement_import_id === item.statement_import_id,
  );
  const first = imports.every(({ imported_at }) => imported_at >= item.imported_at);
  const touchesClosed =
    account !== undefined &&
    (rows.some(({ booking_date }) => monthOf(booking_date) < account.open_month) ||
      (first && monthOf(account.start_date) < account.open_month));
  return [
    ...(imports.some(({ imported_at }) => imported_at > item.imported_at) ? ["NOT_LATEST"] : []),
    ...(rows.some(({ state: rowState }) => rowState === "ACCEPTED") ? ["HAS_ACCEPTED_ROWS"] : []),
    ...(touchesClosed ? ["TOUCHES_CLOSED_MONTH"] : []),
  ];
}
