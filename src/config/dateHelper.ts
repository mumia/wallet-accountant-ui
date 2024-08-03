import { padValue } from "./stringHelper";

const ISODateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d*)?(?:[-+]\d{2}:?\d{2}|Z)?$/;

const isIsoDateString = (value: unknown): value is string => {
  return typeof value === "string" && ISODateFormat.test(value);
};

export const handleDatesInCollection = <T extends object>(data: T[]): T[] => {
  for (let i = 0; i < data.length; i++) {
    data[i] = handleDates(data[i])
  }

  return data
};

export const handleDates = <T extends object>(data: T): T => {
  if (data == null) {
    return data
  }

  for (const [key, value] of Object.entries(data)) {
    if (isIsoDateString(value)) {
      // @ts-expect-error this is a hack to make the type checker happy
      data[key] = new Date(value);
    } else if (typeof value === "object") {
      handleDates(value);
    }
  }

  return data
};

export function showDate(date: Date): string {
  return date.getFullYear() + "/" + padValue(date.getMonth() + 1) + "/" + padValue(date.getDate());
}

export function showDateWithTime(date: Date): string {
  return showDate(date) + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
}
