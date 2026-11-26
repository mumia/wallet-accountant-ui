import { createFileRoute } from "@tanstack/react-router";

import { ConnectionsTab } from "../../../../../../features/connections/connections-tab";
import { redirectCashAccount } from "../../../../../../lib/account-query";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/connections/")({
  // A cash Account has no statements: it goes to its Transactions.
  beforeLoad: ({ context, params }) => redirectCashAccount(context, params),
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/connections", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function Connections() {
    const { householdId, accountId } = Route.useParams();
    return <ConnectionsTab householdId={householdId} accountId={accountId} />;
  },
});
