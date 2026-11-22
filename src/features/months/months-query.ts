// An Account's months (spec, "Months, Month close, Reverse and Void"): the one
// list both screens read, and Month close and Reopen.
import { useMutation } from "@tanstack/react-query";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { unwrap } from "../../api/unwrap";
import { useRefetchAccountReads } from "../../lib/account-query";
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

export function useCloseMonth(householdId: string, accountId: string, currency: string) {
  const { fetchClient } = useApi();
  const refetch = useRefetchAccountReads(householdId, accountId);
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
  const refetch = useRefetchAccountReads(householdId, accountId);
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
