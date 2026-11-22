import { createFileRoute } from "@tanstack/react-router";

import { MonthPage } from "../../../../../../features/months/month-page";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/months/$bookingMonth",
)({
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    Promise.all([
      queryClient.query(
        api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/months", {
          params: { path: { household_id: householdId, account_id: accountId } },
        }),
      ),
      queryClient.query(api.queryOptions("get", "/currencies")),
    ]),
  component: function Month() {
    const { householdId, accountId, bookingMonth } = Route.useParams();
    return (
      <MonthPage householdId={householdId} accountId={accountId} bookingMonth={bookingMonth} />
    );
  },
});
