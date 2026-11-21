import { createFileRoute } from "@tanstack/react-router";

import { AccountsOverview } from "../../../features/accounts/accounts-overview";

export const Route = createFileRoute("/households/$householdId/")({
  component: function Overview() {
    const { householdId } = Route.useParams();
    return <AccountsOverview householdId={householdId} />;
  },
});
