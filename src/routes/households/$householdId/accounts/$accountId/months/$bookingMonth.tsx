import { createFileRoute } from "@tanstack/react-router";

import { AccountTabStub } from "../../../../../../features/accounts/tab-stub";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/months/$bookingMonth",
)({
  component: () => <AccountTabStub page="month" />,
});
