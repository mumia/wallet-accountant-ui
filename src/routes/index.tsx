import { createFileRoute } from "@tanstack/react-router";

import { WelcomePage } from "../features/welcome/welcome-page";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});
