import { createFileRoute } from "@tanstack/react-router";

import { ToReviewTab } from "../../../../../features/to-review/to-review-tab";
import { toReviewSearch } from "../../../../../lib/search";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/to-review")({
  validateSearch: toReviewSearch,
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
