// To review's reads and writes (spec, "To review"): two reads by state, and
// Accept, Keep and Discard, one request per row.
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "../../api/context";
import { errorStatus } from "../../api/problem";
import type { components } from "../../api/schema.gen";
import { unwrap } from "../../api/unwrap";
import type { Month } from "../../lib/month";
import { notificationsKey } from "../../lib/notifications";
import { settleEach } from "../../lib/pool";

export type ImportedTransaction = components["schemas"]["ImportedTransaction"];
type Page = components["schemas"]["ImportedTransactionPage"];
type ReviewState = "PENDING" | "SUSPECTED_DUPLICATE";

const path = "/households/{household_id}/accounts/{account_id}/imported-transactions";
const pageSize = 200;
/** How many row requests a bulk action sends at once. */
const concurrency = 4;

function accountParams(householdId: string, accountId: string) {
  return { params: { path: { household_id: householdId, account_id: accountId } } };
}

function usePage(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  return async (query: { state: ReviewState; booking_month?: Month; cursor?: string }) =>
    unwrap(
      await fetchClient.GET(path, {
        params: {
          path: { household_id: householdId, account_id: accountId },
          query: { ...query, limit: pageSize },
        },
      }),
    );
}

/** Every row in `state`, every page of it, in one month or all. */
export function useAllRows(
  householdId: string,
  accountId: string,
  state: ReviewState,
  month: Month | undefined,
  enabled: boolean,
) {
  const page = usePage(householdId, accountId);
  const query = { state, ...(month === undefined ? {} : { booking_month: month }) };
  return useQuery({
    queryKey: [
      "get",
      path,
      { params: { ...accountParams(householdId, accountId).params, query } },
      "all-pages",
    ],
    queryFn: async () => {
      const items: ImportedTransaction[] = [];
      let cursor: string | undefined;
      do {
        const next: Page = await page({ ...query, ...(cursor === undefined ? {} : { cursor }) });
        items.push(...next.items);
        cursor = next.next_cursor;
      } while (cursor !== undefined);
      return items;
    },
    enabled,
  });
}

/** Pending rows of all months, a page at a time. */
export function usePendingPages(householdId: string, accountId: string, enabled: boolean) {
  const page = usePage(householdId, accountId);
  return useInfiniteQuery({
    queryKey: [
      "get",
      path,
      { params: { ...accountParams(householdId, accountId).params, query: { state: "PENDING" } } },
      "infinite",
    ],
    queryFn: ({ pageParam }) =>
      page({ state: "PENDING", ...(pageParam === undefined ? {} : { cursor: pageParam }) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
    enabled,
  });
}

export type Decision = "accept" | "keep" | "discard";

/** How one row's request ended. A 409 means someone else decided it first: not a failure. */
export type Outcome =
  | { row: ImportedTransaction; kind: "done" }
  | { row: ImportedTransaction; kind: "conflict"; error: unknown }
  | { row: ImportedTransaction; kind: "failed"; error: unknown };

/**
 * Decides rows, one request per row, a few at a time, each with its own
 * Idempotency-Key and the write retries. Afterwards every read a decision
 * changes is refetched; the promise resolves once they are.
 */
export function useDecide(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: async ({
      decision,
      row,
      categoryId,
    }: {
      decision: Decision;
      row: ImportedTransaction;
      categoryId?: string;
    }) => {
      const params = {
        path: { household_id: householdId, imported_transaction_id: row.imported_transaction_id },
      };
      const prefix = "/households/{household_id}/imported-transactions/{imported_transaction_id}";
      switch (decision) {
        case "accept":
          return unwrap(
            await fetchClient.POST(`${prefix}/accept`, {
              params,
              body: categoryId === undefined ? {} : { category_id: categoryId },
            }),
          );
        case "keep":
          return unwrap(await fetchClient.POST(`${prefix}/keep`, { params }));
        case "discard":
          return unwrap(await fetchClient.POST(`${prefix}/discard`, { params }));
      }
    },
  });

  const refetch = () => {
    const account = accountParams(householdId, accountId);
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["get", path, account] }),
      queryClient.invalidateQueries({
        queryKey: ["get", "/households/{household_id}/accounts/{account_id}/transactions", account],
      }),
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
      queryClient.invalidateQueries({ queryKey: notificationsKey(householdId) }),
      // The months' counts.
      queryClient.invalidateQueries({
        queryKey: ["get", "/households/{household_id}/accounts/{account_id}/months", account],
      }),
      // Deciding the last Suspected duplicate runs its import's Balance check.
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/connections/{connection_id}/statement-imports",
        ],
      }),
    ]);
  };

  return async (
    decision: Decision,
    rows: readonly ImportedTransaction[],
    categoryFor: (row: ImportedTransaction) => string | undefined = () => undefined,
  ): Promise<Outcome[]> => {
    const settled = await settleEach(rows, concurrency, (row) => {
      const categoryId = categoryFor(row);
      return mutateAsync({ decision, row, ...(categoryId === undefined ? {} : { categoryId }) });
    });
    await refetch();
    return rows.map((row, index): Outcome => {
      const result = settled[index];
      if (result?.status === "fulfilled") {
        return { row, kind: "done" };
      }
      const error: unknown = result?.reason;
      return errorStatus(error) === 409
        ? { row, kind: "conflict", error }
        : { row, kind: "failed", error };
    });
  };
}
