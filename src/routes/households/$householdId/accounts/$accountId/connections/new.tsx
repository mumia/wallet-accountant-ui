import { createFileRoute } from "@tanstack/react-router";

import { ConnectionEditor } from "../../../../../../features/connections/connection-editor";
import { connectionEditorSearch } from "../../../../../../lib/search";
import { redirectCashAccount } from "../../../../../../lib/account-query";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/connections/new",
)({
  // A cash Account has no statements: it goes to its Transactions.
  validateSearch: connectionEditorSearch,
  beforeLoad: ({ context, params }) => redirectCashAccount(context, params),
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
