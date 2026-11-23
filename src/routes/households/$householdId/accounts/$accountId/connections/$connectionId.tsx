import { createFileRoute, notFound } from "@tanstack/react-router";

import { ConnectionEditor } from "../../../../../../features/connections/connection-editor";
import { connectionEditorSearch } from "../../../../../../lib/search";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/connections/$connectionId",
)({
  validateSearch: connectionEditorSearch,
  loader: async ({
    context: { api, queryClient },
    params: { householdId, accountId, connectionId },
  }) => {
    const connections = await queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/connections", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    );
    if (!connections.items.some(({ connection_id }) => connection_id === connectionId)) {
      throw notFound();
    }
    // Whether it has Statement imports decides the "future imports only" note.
    await queryClient.query(
      api.queryOptions(
        "get",
        "/households/{household_id}/connections/{connection_id}/statement-imports",
        { params: { path: { household_id: householdId, connection_id: connectionId } } },
      ),
    );
  },
  component: function EditConnection() {
    const { householdId, accountId, connectionId } = Route.useParams();
    const { from } = Route.useSearch();
    return (
      // Another Connection starts the form over.
      <ConnectionEditor
        key={connectionId}
        householdId={householdId}
        accountId={accountId}
        connectionId={connectionId}
        from={from}
      />
    );
  },
});
