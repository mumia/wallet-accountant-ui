// The dates a cash Account takes a Transaction on (cash-accounts-and-transfers
// spec, "Record a Transaction").
import { today, todayUtc, type IsoDate } from "./date";

export interface CashDateRange {
  /** The later of the open month's 1st and the start date. */
  min: IsoDate;
  /** Today in UTC, as the backend reckons it. */
  max: IsoDate;
  /** Why `min` is where it is: the start date, or the closed months before it. */
  minReason: "start-date" | "closed-month";
  /** Today in the browser's zone, kept within the range. */
  initial: IsoDate;
}

/**
 * The range of a cash Account's Transaction dates. Months after the open month
 * are fine: only today bounds them.
 */
export function cashDateRange(
  account: { start_date: string; open_month: string },
  now: Date = new Date(),
): CashDateRange {
  const startDate = account.start_date as IsoDate;
  const openFirst = `${account.open_month}-01` as IsoDate;
  const min = startDate >= openFirst ? startDate : openFirst;
  const max = todayUtc(now);
  const local = today(now);
  const initial = local > max ? max : local < min ? min : local;
  return { min, max, minReason: min === startDate ? "start-date" : "closed-month", initial };
}
