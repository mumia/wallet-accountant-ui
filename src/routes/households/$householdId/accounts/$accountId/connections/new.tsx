import { createFileRoute } from "@tanstack/react-router";

import { ConnectionEditor } from "../../../../../../features/connections/connection-editor";
import { connectionEditorSearch } from "../../../../../../lib/search";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/connections/new",
)({
  validateSearch: connectionEditorSearch,
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/connections", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function NewConnection() {
    const { householdId, accountId } = Route.useParams();
    const { from } = Route.useSearch();
    return (
      <ConnectionEditor
        householdId={householdId}
        accountId={accountId}
        connectionId={undefined}
        from={from}
      />
    );
  },
});
