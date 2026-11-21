import { createFileRoute, notFound } from "@tanstack/react-router";

import { errorStatus } from "../../../../api/problem";
import { AccountPage } from "../../../../features/accounts/account-page";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId")({
  loader: async ({ context: { api, queryClient }, params: { householdId, accountId } }) => {
    try {
      await queryClient.query(
        api.queryOptions("get", "/households/{household_id}/accounts/{account_id}", {
          params: { path: { household_id: householdId, account_id: accountId } },
        }),
      );
    } catch (error) {
      if (errorStatus(error) === 404) {
        throw notFound();
      }
      throw error;
    }
  },
  component: function Account() {
    const { householdId, accountId } = Route.useParams();
    return <AccountPage householdId={householdId} accountId={accountId} />;
  },
});
