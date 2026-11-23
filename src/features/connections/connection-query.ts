// The Connection writes (spec, "CSV mapping editor"): create with its mapping
// in one request, rename and save the mapping of an existing one, and test an
// unsaved mapping on a sample file.
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { unwrap } from "../../api/unwrap";
import type { Connection } from "../../components/connection-names";
import type { CsvMapping } from "../../lib/csv-mapping";

export type CsvMappingTest = components["schemas"]["CsvMappingTest"];

const connectionsPath = "/households/{household_id}/accounts/{account_id}/connections";

function useInvalidateConnections(householdId: string, accountId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        connectionsPath,
        { params: { path: { household_id: householdId, account_id: accountId } } },
      ],
    });
}

/** What Save sends: the name, and the mapping when it changed (always for a new Connection). */
export interface ConnectionSave {
  name: string;
  /** Undefined when the mapping is unchanged. */
  mapping: CsvMapping | undefined;
}

/**
 * Save: a new Connection is created with its mapping in one request; an
 * existing one is renamed when its name changed and its mapping saved when that
 * changed. Either way the Account's Connections are read again.
 */
export function useSaveConnection(
  householdId: string,
  accountId: string,
  existing: Connection | undefined,
) {
  const { fetchClient } = useApi();
  const invalidate = useInvalidateConnections(householdId, accountId);
  const path = { household_id: householdId, account_id: accountId };
  return useMutation({
    mutationFn: async ({ name, mapping }: ConnectionSave): Promise<Connection> => {
      if (existing === undefined) {
        return unwrap(
          await fetchClient.POST(connectionsPath, {
            params: { path },
            body: {
              name,
              kind: "STATEMENT_FILE_IMPORT",
              ...(mapping === undefined ? {} : { csv_mapping: mapping }),
            },
          }),
        );
      }
      const connection = { params: { path: { ...path, connection_id: existing.connection_id } } };
      let saved = existing;
      if (name !== existing.name) {
        saved = unwrap(
          await fetchClient.PATCH(`${connectionsPath}/{connection_id}`, {
            ...connection,
            body: { name },
          }),
        );
      }
      if (mapping !== undefined) {
        saved = unwrap(
          await fetchClient.PUT(`${connectionsPath}/{connection_id}/csv-mapping`, {
            ...connection,
            body: mapping,
          }),
        );
      }
      return saved;
    },
    // A rename that went through before a refused mapping is still a change.
    onSettled: () => invalidate(),
  });
}

/** Reads a sample file with an unsaved mapping on the backend; nothing is recorded. */
export function useTestMapping(householdId: string, accountId: string) {
  const { fetchClient } = useApi();
  return useMutation({
    mutationFn: async ({ mapping, file }: { mapping: CsvMapping; file: File }) =>
      unwrap(
        await fetchClient.POST(
          "/households/{household_id}/accounts/{account_id}/csv-mapping-tests",
          {
            params: { path: { household_id: householdId, account_id: accountId } },
            body: { csv_mapping: mapping, file },
            // The mapping is a plain form field holding JSON text, not a file part.
            bodySerializer: ({ csv_mapping, file: sample }) => {
              const form = new FormData();
              form.append("csv_mapping", JSON.stringify(csv_mapping));
              form.append("file", sample);
              return form;
            },
          },
        ),
      ),
  });
}
