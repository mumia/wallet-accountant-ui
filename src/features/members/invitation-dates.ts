/** When an Invitation was issued or expires, as a date and time in the User's locale. */
export function dateAndTime(dateTime: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(dateTime),
  );
}
