// The Statement import flow's reads and writes (spec, "Statement import flow").
// Preview and upload send the file as multipart; the API client's middleware
// gives each its own Idempotency-Key, kept while the same file and fields are
// sent again.
import { useMutation, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { unwrap } from "../../api/unwrap";
import type { Connection } from "../../components/connection-names";
import { useRefetchAccountReads } from "../../lib/account-query";
import type { Decimal } from "../../lib/money";
import { pollNotificationsSoon } from "../../lib/notifications";

export type StatementImport = components["schemas"]["StatementImport"];
export type StatementImportPreview = components["schemas"]["StatementImportPreview"];

const previewPath =
  "/households/{household_id}/connections/{connection_id}/statement-imports/previews";
const importsPath = "/households/{household_id}/connections/{connection_id}/statement-imports";

/** What the User gave on the file step; it stays in page memory until a reload. */
export interface StatementInput {
  file: File;
  exportBalance: Decimal;
  /** Only on an Account's first import. */
  confirmation?: Decimal;
}

function multipart(fields: Record<string, Blob | string | undefined>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) {
      form.append(name, value);
    }
  }
  return form;
}

/** The Opening balance preview of an Account's first import. */
export function usePreview(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId, input }: { connectionId: string; input: StatementInput }) =>
      unwrap(
        await fetchClient.POST(previewPath, {
          params: { path: { household_id: householdId, connection_id: connectionId } },
          body: {
            file: input.file,
            export_balance: input.exportBalance,
            export_balance_confirmation: input.confirmation ?? input.exportBalance,
          },
          bodySerializer: (body) => multipart(body),
        }),
      ),
    // "Opening balance already recorded": the Account read turns the flow into a later import.
    onError: () => invalidateAccount(queryClient, householdId, accountId),
  });
}

/**
 * The upload itself: a later import, or a first one confirming its preview.
 * Afterwards every read it changes is refetched.
 */
export function useUpload(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      connectionId,
      input,
      previewId,
    }: {
      connectionId: string;
      input: StatementInput;
      previewId?: string;
    }) =>
      unwrap(
        await fetchClient.POST(importsPath, {
          params: { path: { household_id: householdId, connection_id: connectionId } },
          body: {
            file: input.file,
            export_balance: input.exportBalance,
            ...(previewId === undefined ? {} : { preview_id: previewId }),
          },
          bodySerializer: (body) => multipart(body),
        }),
      ),
    onSuccess: () => {
      pollNotificationsSoon(queryClient, householdId);
      return invalidateAfterImport(queryClient, householdId, accountId);
    },
    // A refusal may mean the Account changed under the flow (its Opening balance
    // recorded since the page opened): the Account read decides first or later.
    onError: () => invalidateAccount(queryClient, householdId, accountId),
  });
}

type QueryClient = ReturnType<typeof useQueryClient>;

function invalidateAccount(queryClient: QueryClient, householdId: string, accountId: string) {
  return queryClient.invalidateQueries({
    queryKey: [
      "get",
      "/households/{household_id}/accounts/{account_id}",
      { params: { path: { household_id: householdId, account_id: accountId } } },
    ],
  });
}

/**
 * Everything a Statement import changes (spec, "Freshness"): the Account and the
 * Accounts overview, the months (their counts, and months it adds), To review,
 * the Transactions (a first import's Opening balance) and the Statement imports.
 */
function invalidateAfterImport(queryClient: QueryClient, householdId: string, accountId: string) {
  const account = { params: { path: { household_id: householdId, account_id: accountId } } };
  return Promise.all([
    invalidateAccount(queryClient, householdId, accountId),
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/households/{household_id}/accounts",
        { params: { path: { household_id: householdId } } },
      ],
    }),
    queryClient.invalidateQueries({
      queryKey: ["get", "/households/{household_id}/accounts/{account_id}/months", account],
    }),
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/households/{household_id}/accounts/{account_id}/imported-transactions",
        account,
      ],
    }),
    queryClient.invalidateQueries({
      queryKey: ["get", "/households/{household_id}/accounts/{account_id}/transactions", account],
    }),
    queryClient.invalidateQueries({ queryKey: ["get", importsPath] }),
  ]);
}

/**
 * The Connection the Account's latest Statement import came through, among
 * `connections`; undefined when none has an import. Reads each one's imports.
 */
export function useLatestImportConnection(
  householdId: string,
  connections: readonly Connection[],
): string | undefined {
  const { api } = useApi();
  const reads = useSuspenseQueries({
    queries: connections.map((connection) =>
      api.queryOptions("get", importsPath, {
        params: {
          path: { household_id: householdId, connection_id: connection.connection_id },
        },
      }),
    ),
  });
  let latest: StatementImport | undefined;
  for (const { data } of reads) {
    for (const item of data.items) {
      if (
        item.voided_at === undefined &&
        (latest === undefined || item.imported_at > latest.imported_at)
      ) {
        latest = item;
      }
    }
  }
  return latest?.connection_id;
}

/**
 * Every Statement import of the Account, across `connections`, newest first
 * (spec, "Statement imports tab").
 */
export function useAccountStatementImports(
  householdId: string,
  connections: readonly Connection[],
): StatementImport[] {
  const { api } = useApi();
  return useSuspenseQueries({
    queries: connections.map((connection) =>
      api.queryOptions("get", importsPath, {
        params: {
          path: { household_id: householdId, connection_id: connection.connection_id },
        },
      }),
    ),
    combine: (reads) =>
      reads
        .flatMap(({ data }) => data.items)
        .sort((a, b) => b.imported_at.localeCompare(a.imported_at)),
  });
}

/**
 * Voids a Statement import. Afterwards everything it changes is read again:
 * the Account (a first import's Opening balance), its months, To review, the
 * Transactions and the Statement imports.
 */
export function useVoid(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  const queryClient = useQueryClient();
  const refetchAccount = useRefetchAccountReads(householdId, accountId);
  return useMutation({
    mutationFn: async (item: StatementImport) =>
      unwrap(
        await fetchClient.POST(`${importsPath}/{statement_import_id}/void`, {
          params: {
            path: {
              household_id: householdId,
              connection_id: item.connection_id,
              statement_import_id: item.statement_import_id,
            },
          },
        }),
      ),
    onSettled: () =>
      Promise.all([
        refetchAccount(),
        queryClient.invalidateQueries({
          queryKey: [
            "get",
            "/households/{household_id}/accounts/{account_id}/transactions",
            { params: { path: { household_id: householdId, account_id: accountId } } },
          ],
        }),
      ]),
  });
}
