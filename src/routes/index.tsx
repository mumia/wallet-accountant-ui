import { createFileRoute, redirect } from "@tanstack/react-router";

import { homeDestination } from "../features/first-run/home-destination";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    throw redirect({ ...(await homeDestination(context)), replace: true });
  },
});
