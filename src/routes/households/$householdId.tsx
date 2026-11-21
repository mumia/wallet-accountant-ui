import { createFileRoute, notFound } from "@tanstack/react-router";

import { errorStatus } from "../../api/problem";
import { HouseholdHome } from "../../features/households/household-home";

export const Route = createFileRoute("/households/$householdId")({
  loader: async ({ context: { api, queryClient }, params: { householdId } }) => {
    try {
      await queryClient.query(
        api.queryOptions("get", "/households/{household_id}", {
          params: { path: { household_id: householdId } },
        }),
      );
    } catch (error) {
      if (errorStatus(error) === 404) {
        throw notFound();
      }
      throw error;
    }
  },
  component: function Household() {
    const { householdId } = Route.useParams();
    return <HouseholdHome householdId={householdId} />;
  },
});
