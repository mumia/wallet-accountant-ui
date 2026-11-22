// An Account's months (spec, "Months, Month close, Reverse and Void"): the one
// list both screens read, and Month close and Reopen.
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { unwrap } from "../../api/unwrap";
import type { Decimal } from "../../lib/money";

export type AccountMonth = components["schemas"]["AccountMonth"];

const listPath = "/households/{household_id}/accounts/{account_id}/months";
const monthPath = "/households/{household_id}/accounts/{account_id}/months/{booking_month}";

function accountInit(householdId: string, accountId: string) {
  return { params: { path: { household_id: householdId, account_id: accountId } } };
}

/** Every month of the Account, newest first; the route's loader fetches it. */
export function useMonths(householdId: string, accountId: string) {
  const { api } = useApi();
  return api.useSuspenseQuery("get", listPath, accountInit(householdId, accountId));
}

/** What a Month close or a Reopen changes: the months, the Account (its open month) and the lists that lock by it. */
function useRefetchAfter(householdId: string, accountId: string) {
  const queryClient = useQueryClient();
  const account = accountInit(householdId, accountId);
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["get", listPath, account] }),
      queryClient.invalidateQueries({ queryKey: ["get", monthPath] }),
      queryClient.invalidateQueries({
        queryKey: ["get", "/households/{household_id}/accounts/{account_id}", account],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/accounts",
          { params: { path: { household_id: householdId } } },
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/accounts/{account_id}/imported-transactions",
          account,
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/connections/{connection_id}/statement-imports",
        ],
      }),
    ]);
}

export function useCloseMonth(householdId: string, accountId: string, currency: string) {
  const { fetchClient } = useApi();
  const refetch = useRefetchAfter(householdId, accountId);
  return useMutation({
    mutationFn: async ({ month, statementBalance }: { month: string; statementBalance: Decimal }) =>
      unwrap(
        await fetchClient.POST(`${monthPath}/close`, {
          params: {
            path: { household_id: householdId, account_id: accountId, booking_month: month },
          },
          body: { statement_balance: { amount: statementBalance, currency } },
        }),
      ),
    onSuccess: refetch,
  });
}

export function useReopenMonth(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  const refetch = useRefetchAfter(householdId, accountId);
  return useMutation({
    mutationFn: async (month: string) =>
      unwrap(
        await fetchClient.POST(`${monthPath}/reopen`, {
          params: {
            path: { household_id: householdId, account_id: accountId, booking_month: month },
          },
        }),
      ),
    onSettled: refetch,
  });
}
