import { QueryClient } from "@tanstack/react-query";

import { shouldRetryRead, shouldRetryWrite } from "../api/retry";

/** Freshness and retries for every read and write (spec, "Talking to the API"). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: shouldRetryRead,
      },
      mutations: {
        retry: shouldRetryWrite,
      },
    },
  });
}
