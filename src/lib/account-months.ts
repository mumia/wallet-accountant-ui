// Which months the Account area's month fields offer, and where they start
// (spec, "Transactions" and "To review"), from the Account's open month and its
// months list (`GET …/accounts/{account_id}/months`).
import type { Month } from "./month";

/** What an Account, or one of its months, has To review. */
export interface ToReviewCounts {
  pending: number;
  suspected_duplicates: number;
}

/** Rows To review: pending plus undecided Suspected duplicates. */
export function toReviewCount({ pending, suspected_duplicates }: ToReviewCounts): number {
  return pending + suspected_duplicates;
}

/** The month the Transactions tab opens on when the URL names none. */
export function defaultBookingMonth(account: { open_month: string }): Month {
  return account.open_month as Month;
}

/** The Transactions month field: every month of the Account, newest first. */
export function transactionMonths(months: readonly { booking_month: string }[]): Month[] {
  return months.map(({ booking_month }) => booking_month as Month);
}

/**
 * The To review month field: only months with rows To review, newest first,
 * plus the chosen month (one carried over from Transactions, say), so the field
 * can still show it.
 */
export function toReviewMonths(
  months: readonly ({ booking_month: string } & ToReviewCounts)[],
  chosen?: Month,
): Month[] {
  return months
    .filter((month) => toReviewCount(month) > 0 || month.booking_month === chosen)
    .map(({ booking_month }) => booking_month as Month);
}

/** The month's rows To review, or 0 when it isn't one of the Account's months. */
export function toReviewCountIn(
  months: readonly ({ booking_month: string } & ToReviewCounts)[],
  month: Month,
): number {
  const found = months.find(({ booking_month }) => booking_month === month);
  return found === undefined ? 0 : toReviewCount(found);
}
