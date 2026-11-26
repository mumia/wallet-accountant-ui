import { createFileRoute } from "@tanstack/react-router";

import { ToReviewTab } from "../../../../../features/to-review/to-review-tab";
import { toReviewSearch } from "../../../../../lib/search";
import { redirectCashAccount } from "../../../../../lib/account-query";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/to-review")({
  // A cash Account has no statements: it goes to its Transactions.
  validateSearch: toReviewSearch,
  beforeLoad: ({ context, params }) => redirectCashAccount(context, params),
  // The month field offers months from the months list.
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/months", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function ToReview() {
    const { householdId, accountId } = Route.useParams();
    const { booking_month, state } = Route.useSearch();
    return (
      <ToReviewTab
        householdId={householdId}
        accountId={accountId}
        bookingMonth={booking_month}
        suspectedOnly={state === "SUSPECTED_DUPLICATE"}
      />
    );
  },
});
