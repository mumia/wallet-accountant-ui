import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import type { Api } from "../api/client";
import { LoadError } from "../components/load-error";
import { NotFound } from "../components/not-found";
import { routeTree } from "../routeTree.gen";

/** What every route's `beforeLoad` and `loader` get: the API client and the query cache. */
export interface RouterContext {
  api: Api["api"];
  queryClient: QueryClient;
}

/** The router, made once at boot with the app's API client (src/app/app.tsx). */
export function createAppRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    context,
    scrollRestoration: true,
    // Every route shows its own failures, so inside the shell they show in the
    // shell's content area and the sidebar stays.
    defaultErrorComponent: LoadError,
    defaultNotFoundComponent: NotFound,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
