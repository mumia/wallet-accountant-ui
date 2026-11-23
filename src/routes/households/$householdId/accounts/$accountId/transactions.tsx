import { createFileRoute } from "@tanstack/react-router";

import { TransactionsTab } from "../../../../../features/transactions/transactions-tab";
import { transactionsSearch } from "../../../../../lib/search";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/transactions")({
  validateSearch: transactionsSearch,
  // The month field offers months from the months list.
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/months", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function Transactions() {
    const { householdId, accountId } = Route.useParams();
    const { booking_month, uncategorised, transaction_id } = Route.useSearch();
    return (
      <TransactionsTab
        householdId={householdId}
        accountId={accountId}
        bookingMonth={booking_month}
        uncategorised={uncategorised === true}
        highlighted={transaction_id}
      />
    );
  },
});
