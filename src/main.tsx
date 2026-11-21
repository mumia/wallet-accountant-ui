import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initI18n } from "./app/i18n";
import { router } from "./app/router";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("index.html has no #root element");
}

await initI18n();

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
