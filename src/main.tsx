import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/app";
import { initI18n } from "./app/i18n";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("index.html has no #root element");
}

await initI18n();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
