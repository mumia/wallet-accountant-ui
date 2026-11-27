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

export interface CountedOnRange {
  /** The day after the month's last day. */
  min: IsoDate;
  /** Today in UTC, as the backend reckons it. */
  max: IsoDate;
  /** Today in the browser's zone, kept within the range. */
  initial: IsoDate;
}

/** The month's last day: "2026-02-28" for "2026-02". */
export function lastDayOf(month: string): IsoDate {
  const [year = 0, mm = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mm, 0)).toISOString().slice(0, 10) as IsoDate;
}

/**
 * The days a cash month's Cash count can be taken on (cash-accounts-and-transfers
 * spec, "Closing a cash month"): after the month's last day, and no later than
 * today in UTC. While the month hasn't ended, `min` is after `max`: the close
 * form is disabled then.
 */
export function countedOnRange(month: string, now: Date = new Date()): CountedOnRange {
  const [year = 0, mm = 1] = month.split("-").map(Number);
  const min = new Date(Date.UTC(year, mm, 1)).toISOString().slice(0, 10) as IsoDate;
  const max = todayUtc(now);
  const local = today(now);
  const initial = local > max ? max : local < min ? min : local;
  return { min, max, initial };
}
