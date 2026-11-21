import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import type { Api } from "../api/client";
import { routeTree } from "../routeTree.gen";

/** What every route's `beforeLoad` and `loader` get: the API client and the query cache. */
export interface RouterContext {
  api: Api["api"];
  queryClient: QueryClient;
}

/** The router, made once at boot with the app's API client (src/app/app.tsx). */
export function createAppRouter(context: RouterContext) {
  return createRouter({ routeTree, context, scrollRestoration: true });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
