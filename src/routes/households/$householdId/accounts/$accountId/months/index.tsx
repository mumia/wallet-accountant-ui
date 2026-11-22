import { createFileRoute } from "@tanstack/react-router";

import { MonthsTab } from "../../../../../../features/months/months-tab";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/months/")({
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/months", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function Months() {
    const { householdId, accountId } = Route.useParams();
    return <MonthsTab householdId={householdId} accountId={accountId} />;
  },
});
