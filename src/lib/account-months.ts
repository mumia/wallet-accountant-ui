// ─── SEAM: finished in ticket 19 ───────────────────────────────────────────
// The backend doesn't serve an Account's open month (`open_month`) or its
// months list (`GET …/accounts/{account_id}/months`) yet (backend-handoff.md).
// Until it does:
// - a screen with no `booking_month` shows all months, not the open month;
// - the month field offers every month from the Account's start date to today.
// Ticket 19 replaces both bodies and nothing else.
import { monthOf, monthsBetween, type Month } from "./month";

/** The month a tab opens on when the URL names none. */
export function defaultBookingMonth(): Month | "all" {
  return "all";
}

/** The months the month field offers, newest first. */
export function accountMonths(account: { start_date: string }, now: Date = new Date()): Month[] {
  return monthsBetween(monthOf(account.start_date), monthOf(now));
}
// ─── END SEAM ──────────────────────────────────────────────────────────────
