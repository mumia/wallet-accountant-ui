import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import type { RouterContext } from "../app/router";
import { LoadError } from "../components/load-error";
import { NotFound } from "../components/not-found";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  errorComponent: LoadError,
  notFoundComponent: NotFound,
});
