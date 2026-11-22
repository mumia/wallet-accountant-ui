import { createFileRoute } from "@tanstack/react-router";

import { TransactionsTab } from "../../../../../features/transactions/transactions-tab";
import { transactionsSearch } from "../../../../../lib/search";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/transactions")({
  validateSearch: transactionsSearch,
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
