// The one Account read the Account area's routes share, and what the writes
// that change an Account's months read again.
import { useQueryClient } from "@tanstack/react-query";
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

/**
 * What a Month close, a Reopen or a Reverse changes (spec, "Freshness"): the
 * months, the Account (its open month and counts), the Accounts list, and the
 * lists that lock by the month: Imported transactions and Statement imports.
 */
export function useRefetchAccountReads(householdId: string, accountId: string) {
  const queryClient = useQueryClient();
  const account = { params: { path: { household_id: householdId, account_id: accountId } } };
  const accountPath = "/households/{household_id}/accounts/{account_id}";
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["get", `${accountPath}/months`, account] }),
      queryClient.invalidateQueries({
        queryKey: ["get", `${accountPath}/months/{booking_month}`],
      }),
      queryClient.invalidateQueries({ queryKey: ["get", accountPath, account] }),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/accounts",
          { params: { path: { household_id: householdId } } },
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: ["get", `${accountPath}/imported-transactions`, account],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/connections/{connection_id}/statement-imports",
        ],
      }),
    ]);
}
