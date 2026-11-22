// Booking months, written `YYYY-MM` as the API writes them.

export type Month = `${number}-${number}`;

/** A month, or every month. */
export type MonthChoice = Month | "all";

export function isMonth(value: string): value is Month {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** The month a date (`YYYY-MM-DD`) or `Date` falls in. */
export function monthOf(date: string | Date): Month {
  if (typeof date === "string") {
    return date.slice(0, 7) as Month;
  }
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}` as Month;
}

export function addMonths(month: Month, count: number): Month {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return monthOf(new Date(year, index - 1 + count, 1));
}

/** Every month from `first` to `last`, newest first. */
export function monthsBetween(first: Month, last: Month): Month[] {
  const months: Month[] = [];
  for (let month = last; month >= first; month = addMonths(month, -1)) {
    months.push(month);
  }
  return months;
}

/** "March 2026". */
export function formatMonth(month: Month, locale?: string): string {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year, index - 1, 1),
  );
}

/** The first day of the month after `month`: when `month` can close. */
export function closesFrom(month: Month): Date {
  const [year = 0, index = 1] = month.split("-").map(Number);
  // The backend decides by its clock in UTC.
  return new Date(Date.UTC(year, index, 1));
}

/** Whether the month has ended, by the clock in UTC, as the backend decides. */
export function hasEnded(month: Month, now: Date = new Date()): boolean {
  return now.getTime() >= closesFrom(month).getTime();
}
