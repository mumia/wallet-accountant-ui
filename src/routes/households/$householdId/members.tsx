import { createFileRoute } from "@tanstack/react-router";

import { errorStatus } from "../../../api/problem";
import { MembersPage } from "../../../features/members/members-page";
import { HouseholdError, NotAMemberError } from "../../../features/shell/not-a-member";

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
      // The members list is 404 only for someone who isn't a member (any more).
      if (errorStatus(error) === 404) {
        throw new NotAMemberError(householdId);
      }
      throw error;
    }
  },
  errorComponent: HouseholdError,
  component: function Members() {
    const { householdId } = Route.useParams();
    return <MembersPage householdId={householdId} />;
  },
});
