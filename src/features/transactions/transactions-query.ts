// An Account's Transactions (spec, "Talking to the API": long lists): a chosen
// month loads every page; all months load page by page as the list scrolls.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { unwrap } from "../../api/unwrap";
import type { components } from "../../api/schema.gen";
import { errorText } from "../../components/error-text";
import { useErrorToast } from "../../components/toaster";
import { refetchAccountReads, useRefetchAccountReads } from "../../lib/account-query";
import type { Month } from "../../lib/month";

export type AccountTransaction = components["schemas"]["AccountTransaction"];
type Page = components["schemas"]["AccountTransactionPage"];

const path = "/households/{household_id}/accounts/{account_id}/transactions";
const pageSize = 200;

/**
 * Every Transactions read of the Account starts with this key, in the shape
 * openapi-react-query uses, so a write elsewhere can invalidate it by path.
 */
export function transactionsKey(householdId: string, accountId: string) {
  return ["get", path, { params: { path: { household_id: householdId, account_id: accountId } } }];
}

function monthKey(householdId: string, accountId: string, month: Month, inTransit: boolean) {
  const pathParams = { household_id: householdId, account_id: accountId };
  const query = inTransit ? { booking_month: month, in_transit: true } : { booking_month: month };
  return ["get", path, { params: { path: pathParams, query } }, "all-pages"];
}

function allKey(householdId: string, accountId: string) {
  return [...transactionsKey(householdId, accountId), "infinite"];
}

function usePage() {
  const { fetchClient } = useApi();
  return async (
    householdId: string,
    accountId: string,
    query: { booking_month?: Month; in_transit?: true; cursor?: string },
  ) => {
    return unwrap(
      await fetchClient.GET(path, {
        params: {
          path: { household_id: householdId, account_id: accountId },
          query: { ...query, limit: pageSize },
        },
      }),
    );
  };
}

/**
 * One month, every page of it; with `inTransit`, only its Transfer legs In
 * transit, as the backend filters them (`in_transit=true`).
 */
export function useMonthTransactions(
  householdId: string,
  accountId: string,
  month: Month,
  inTransit = false,
) {
  const page = usePage();
  return useQuery({
    queryKey: monthKey(householdId, accountId, month, inTransit),
    queryFn: async () => {
      const items: AccountTransaction[] = [];
      let cursor: string | undefined;
      do {
        const next: Page = await page(householdId, accountId, {
          booking_month: month,
          ...(inTransit ? { in_transit: true as const } : {}),
          ...(cursor === undefined ? {} : { cursor }),
        });
        items.push(...next.items);
        cursor = next.next_cursor;
      } while (cursor !== undefined);
      return items;
    },
  });
}

/** All months, oldest first, a page at a time. */
export function useAllTransactions(householdId: string, accountId: string) {
  const page = usePage();
  return useInfiniteQuery({
    queryKey: allKey(householdId, accountId),
    queryFn: ({ pageParam }) =>
      page(householdId, accountId, pageParam === undefined ? {} : { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  });
}

interface CategoryChange {
  transaction: AccountTransaction;
  categoryId: string;
  categoryName: string;
  /** How the row is named in a failure toast: "Mar 12, 2026, Albert Heijn, -€23.40". */
  rowLabel: string;
}

type CachedTransactions = AccountTransaction[] | InfiniteData<Page> | undefined;

function withCategory(cached: CachedTransactions, change: CategoryChange): CachedTransactions {
  const update = (item: AccountTransaction) =>
    item.transaction_id === change.transaction.transaction_id
      ? { ...item, category_id: change.categoryId, category_name: change.categoryName }
      : item;
  if (cached === undefined) {
    return cached;
  }
  if (Array.isArray(cached)) {
    return cached.map(update);
  }
  return { ...cached, pages: cached.pages.map((p) => ({ ...p, items: p.items.map(update) })) };
}

/**
 * Sets a Transaction's Category from its row (spec, "Transactions"): shown at
 * once, rolled back with a toast naming the row if the save fails.
 */
export function useChangeCategory(householdId: string, accountId: string) {
  const { t } = useTranslation("transactions");
  const { t: tCommon } = useTranslation();
  const { fetchClient } = useApi();
  const queryClient = useQueryClient();
  const toast = useErrorToast();
  const key = transactionsKey(householdId, accountId);

  return useMutation({
    mutationFn: async (change: CategoryChange) => {
      return unwrap(
        await fetchClient.PATCH("/households/{household_id}/transactions/{transaction_id}", {
          params: {
            path: { household_id: householdId, transaction_id: change.transaction.transaction_id },
          },
          body: { category_id: change.categoryId },
        }),
      );
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueriesData<CachedTransactions>({ queryKey: key });
      queryClient.setQueriesData<CachedTransactions>({ queryKey: key }, (cached) =>
        withCategory(cached, change),
      );
      return { before };
    },
    onError: (error, change, context) => {
      context?.before.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      const { title, detail } = errorText(error, tCommon);
      toast(
        t("categoryFailed", { row: change.rowLabel }),
        detail === undefined ? title : `${title}: ${detail}`,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/**
 * Reverses a Transaction (spec, "Reverse"): not optimistic. Afterwards the
 * list, the months, the Account and To review are read again, since an
 * Accepted row's Imported transaction goes back to pending; for a Transfer
 * leg, the Counterpart Account's too, whose leg is reversed or unmatched
 * (cash-accounts-and-transfers spec, "Reversing legs").
 */
export function useReverse(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  const queryClient = useQueryClient();
  const refetchAccount = useRefetchAccountReads(householdId, accountId);
  return useMutation({
    mutationFn: async (transaction: AccountTransaction) =>
      unwrap(
        await fetchClient.POST("/households/{household_id}/transactions/{transaction_id}/reverse", {
          params: {
            path: { household_id: householdId, transaction_id: transaction.transaction_id },
          },
        }),
      ),
    onSettled: (_reversal, _error, transaction) => {
      const counterpart = transaction.counterpart_account_id;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionsKey(householdId, accountId) }),
        refetchAccount(),
        ...(counterpart === undefined
          ? []
          : [
              queryClient.invalidateQueries({
                queryKey: transactionsKey(householdId, counterpart),
              }),
              refetchAccountReads(queryClient, householdId, counterpart),
            ]),
      ]);
    },
  });
}
