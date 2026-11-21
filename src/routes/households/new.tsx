import { createFileRoute } from "@tanstack/react-router";

import { CreateHouseholdPage } from "../../features/first-run/create-household-page";

export const Route = createFileRoute("/households/new")({
  loader: ({ context: { api, queryClient } }) =>
    queryClient.query(api.queryOptions("get", "/currencies")),
  component: CreateHouseholdPage,
});
