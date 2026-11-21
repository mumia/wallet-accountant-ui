import { createFileRoute, redirect } from "@tanstack/react-router";

import { GettingStarted } from "../../../../../features/accounts/getting-started";
import { loadAccount } from "../../../../../lib/account-query";

// The getting-started checklist while the Account awaits its first Statement
// import; afterwards the Account opens on Transactions.
export const Route = createFileRoute("/households/$householdId/accounts/$accountId/")({
  beforeLoad: async ({ context, params }) => {
    const account = await loadAccount(context, params.householdId, params.accountId);
    if (!account.awaiting_first_statement_import) {
      throw redirect({
        to: "/households/$householdId/accounts/$accountId/transactions",
        params,
        replace: true,
      });
    }
  },
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/connections", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function Checklist() {
    const { householdId, accountId } = Route.useParams();
    return <GettingStarted householdId={householdId} accountId={accountId} />;
  },
});
