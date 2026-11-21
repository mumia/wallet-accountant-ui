import type { QueryClient } from "@tanstack/react-query";

import type { Api } from "../../api/client";
import { isRegistrationRequired } from "../../api/problem";
import { readLastHousehold } from "../../lib/last-household";

export type HomeDestination =
  | { to: "/register" }
  | { to: "/households/new" }
  | { to: "/households/$householdId"; params: { householdId: string } };

/**
 * Where `/` leads (spec, "Screens and routes"): an identity that hasn't redeemed
 * an Invitation to `/register`, a User without a Household to
 * `/households/new`, anyone else to the Household they last opened in this
 * browser, or else their first. Any other failure is thrown for the route's
 * error screen.
 */
export async function homeDestination(
  { api, queryClient }: { api: Api["api"]; queryClient: QueryClient },
  lastHousehold: string | undefined = readLastHousehold(),
): Promise<HomeDestination> {
  let households;
  try {
    households = await queryClient.query(api.queryOptions("get", "/households"));
  } catch (error) {
    if (isRegistrationRequired(error)) {
      return { to: "/register" };
    }
    throw error;
  }
  const { items } = households;
  const household = items.find(({ household_id }) => household_id === lastHousehold) ?? items[0];
  return household === undefined
    ? { to: "/households/new" }
    : { to: "/households/$householdId", params: { householdId: household.household_id } };
}
