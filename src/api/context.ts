import { createContext, use } from "react";

import type { Api } from "./client";

export const ApiContext = createContext<Api | null>(null);

/** The API client the app made at boot: `const { api } = useApi(); api.useQuery(...)`. */
export function useApi(): Api {
  const value = use(ApiContext);
  if (value === null) {
    throw new Error("useApi needs an ApiContext provider (src/app/app.tsx)");
  }
  return value;
}
