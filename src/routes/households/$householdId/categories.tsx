import { createFileRoute } from "@tanstack/react-router";

import { CategoriesPage } from "../../../features/categories/categories-page";

export const Route = createFileRoute("/households/$householdId/categories")({
  loader: ({ context: { api, queryClient }, params: { householdId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/categories", {
        params: { path: { household_id: householdId } },
      }),
    ),
  component: function Categories() {
    const { householdId } = Route.useParams();
    return <CategoriesPage householdId={householdId} />;
  },
});
