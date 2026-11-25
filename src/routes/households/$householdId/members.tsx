import { createFileRoute, notFound } from "@tanstack/react-router";

import { errorStatus } from "../../../api/problem";
import { MembersPage } from "../../../features/members/members-page";

export const Route = createFileRoute("/households/$householdId/members")({
  loader: async ({ context: { api, queryClient }, params: { householdId } }) => {
    // Marks your own row; the screen shows without it when it fails.
    queryClient.query(api.queryOptions("get", "/me")).catch(() => undefined);
    try {
      await queryClient.query(
        api.queryOptions("get", "/households/{household_id}/members", {
          params: { path: { household_id: householdId } },
        }),
      );
    } catch (error) {
      // Not a member (any more): the Household's own not-found screen.
      if (errorStatus(error) === 404) {
        throw notFound({ routeId: "/households/$householdId" });
      }
      throw error;
    }
  },
  component: function Members() {
    const { householdId } = Route.useParams();
    return <MembersPage householdId={householdId} />;
  },
});
