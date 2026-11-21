import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";

import { supportsJsonSourceText } from "../api/exact-json";
import { createQueryClient } from "./query-client";
import { router } from "./router";
import { UnsupportedBrowser } from "./unsupported-browser";

/** The app, or the unsupported-browser screen where amounts couldn't be exact. */
export function App() {
  const [queryClient] = useState(createQueryClient);

  if (!supportsJsonSourceText()) {
    return <UnsupportedBrowser />;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
