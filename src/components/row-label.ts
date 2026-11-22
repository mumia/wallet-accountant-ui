// How a row is named wherever one is listed: its checkbox, its picker, a toast.
import { fromIsoDate, type IsoDate } from "../lib/date";
import { formatMoney, type Money } from "../lib/money";

/** A date as rows show it: "Mar 12, 2026". */
export function mediumDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    fromIsoDate(date as IsoDate),
  );
}

/** "Mar 12, 2026, Albert Heijn, -€23.40". */
export function rowLabel(row: {
  booking_date: string;
  description: string;
  amount: Money;
}): string {
  return [mediumDate(row.booking_date), row.description, formatMoney(row.amount)].join(", ");
}
