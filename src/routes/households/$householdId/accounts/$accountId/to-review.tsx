import { createFileRoute } from "@tanstack/react-router";

import { toReviewSearch } from "../../../../../lib/search";

import { AccountTabStub } from "../../../../../features/accounts/tab-stub";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId/to-review")({
  validateSearch: toReviewSearch,
  component: () => <AccountTabStub page="toReview" />,
});
