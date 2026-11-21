import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Reserved for Zitadel's redirect (redirectPath in /config.json). The sign-in
 * finishes before the router runs and leaves for the page the User started
 * from, so arriving here otherwise only leads home.
 */
export const Route = createFileRoute("/auth/callback")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
