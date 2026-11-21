// The one Account read the Account area's routes share.
import { notFound } from "@tanstack/react-router";

import type { Api } from "../api/client";
import { errorStatus } from "../api/problem";
import type { QueryClient } from "@tanstack/react-query";

/** `GET …/accounts/{id}` through the cache; a 404 is "not found". */
export async function loadAccount(
  { api, queryClient }: { api: Api["api"]; queryClient: QueryClient },
  householdId: string,
  accountId: string,
) {
  try {
    return await queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    );
  } catch (error) {
    if (errorStatus(error) === 404) {
      throw notFound();
    }
    throw error;
  }
}
