import { createFileRoute } from "@tanstack/react-router";

import { bookingMonthSearch } from "../../../../../lib/search";

import { AccountTabStub } from "../../../../../features/accounts/tab-stub";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/to-review")({
  validateSearch: bookingMonthSearch,
  component: () => <AccountTabStub page="toReview" />,
});
