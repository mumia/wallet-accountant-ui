import type { QueryClient } from "@tanstack/react-query";

import { useApi } from "../api/context";
import type { components } from "../api/schema.gen";

export type Me = components["schemas"]["Me"];

/**
 * The signed-in User (`GET /me`), cached app-wide like any read. Undefined
 * while it loads or when it failed: callers fall back to what the token says.
 */
export function useMe(): Me | undefined {
  const { api } = useApi();
  return api.useQuery("get", "/me").data;
}

/** After `PATCH /me`: the User everywhere, and the members lists that name them. */
export async function meChanged(queryClient: QueryClient, me: Me) {
  queryClient.setQueriesData<Me>({ queryKey: ["get", "/me"] }, me);
  await queryClient.invalidateQueries({ queryKey: ["get", "/households/{household_id}/members"] });
}
