// The Household's Notifications read (spec, "Freshness"): polled every 60 s
// while the page is visible and on focus, and again about 3 s and 10 s after a
// Statement import, since the backend raises them a little after.
import type { QueryClient } from "@tanstack/react-query";

const path = "/households/{household_id}/notifications";

/** The read's key, in the shape openapi-react-query uses. */
export function notificationsKey(householdId: string) {
  return ["get", path, { params: { path: { household_id: householdId } } }] as const;
}

/** How often the bell rereads while the page is visible. */
export const notificationsInterval = 60_000;

/** After a Statement import: reread at about 3 s and 10 s. */
export function pollNotificationsSoon(queryClient: QueryClient, householdId: string): void {
  for (const delay of [3_000, 10_000]) {
    setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey(householdId) });
    }, delay);
  }
}
