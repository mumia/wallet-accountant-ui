// Calendar dates (spec, "Add Account"): the API's `format: date` is `YYYY-MM-DD`
// with no time or zone. The UI reads and shows them in the User's locale and
// counts "today" in the browser's own zone.

/** A calendar date as the API writes it: `2026-11-01`. */
export type IsoDate = `${number}-${number}-${number}`;

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/** The date a local `Date` falls on. */
export function toIsoDate(date: Date): IsoDate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as IsoDate;
}

/** Local midnight of a date, for a calendar. */
export function fromIsoDate(date: IsoDate): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function today(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function firstOfMonth(now: Date = new Date()): IsoDate {
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** A date for the User to read and edit: `11/01/2026` in en-US, `01/11/2026` in en-GB. */
export function formatDate(date: IsoDate, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fromIsoDate(date));
}

type Field = "year" | "month" | "day";

/** The order the locale writes day, month and year in. */
function fieldOrder(locale?: string): Field[] {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(new Date(2026, 10, 21))
    .map(({ type }) => type)
    .filter((type): type is Field => type === "year" || type === "month" || type === "day");
}

function validDate(year: number, month: number, day: number): IsoDate | undefined {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? toIsoDate(date)
    : undefined;
}

/**
 * What a User typed, read in their locale's order with any separators
 * (`1/11/26`, `01.11.2026`), or as `2026-11-01`. A two-digit year is this
 * century. Undefined when it isn't a real date.
 */
export function parseDateInput(text: string, locale?: string): IsoDate | undefined {
  const trimmed = text.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso !== null) {
    return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const numbers = trimmed.split(/\D+/).filter((part) => part !== "");
  const order = fieldOrder(locale);
  if (numbers.length !== 3 || order.length !== 3) {
    return undefined;
  }
  const value = (field: Field) => numbers[order.indexOf(field)] ?? "";
  const yearText = value("year");
  if (yearText.length !== 2 && yearText.length !== 4) {
    return undefined;
  }
  const year = Number(yearText) + (yearText.length === 2 ? 2000 : 0);
  return validDate(year, Number(value("month")), Number(value("day")));
}

/** A date in words, for sentences: "November 1, 2026" in en-US. */
export function formatDateLong(date: IsoDate, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(fromIsoDate(date));
}

/** Today as the backend reckons it: the date in UTC, whatever the browser's zone. */
export function todayUtc(now: Date = new Date()): IsoDate {
  return now.toISOString().slice(0, 10) as IsoDate;
}
