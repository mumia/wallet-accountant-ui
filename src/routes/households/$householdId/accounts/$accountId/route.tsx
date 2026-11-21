import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AccountArea } from "../../../../../features/accounts/account-area";
import { loadAccount } from "../../../../../lib/account-query";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId")({
  loader: async ({ context, params: { householdId, accountId } }) => {
    await loadAccount(context, householdId, accountId);
  },
  component: function Account() {
    const { householdId, accountId } = Route.useParams();
    return (
      <AccountArea householdId={householdId} accountId={accountId}>
        <Outlet />
      </AccountArea>
    );
  },
});
