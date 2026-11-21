import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { supportsJsonSourceText } from "../api/exact-json";
import { App } from "./app";
import { ConfigProblem } from "./config-problem";
import { loadConfig } from "./config";
import { initI18n } from "./i18n";
import { UnsupportedBrowser } from "./unsupported-browser";

/**
 * Starts the app: messages first, then the browser check (amounts must be exact,
 * ADR-0002), then /config.json, then the app.
 */
export async function boot(root: HTMLElement): Promise<void> {
  await initI18n();
  const reactRoot = createRoot(root);
  if (!supportsJsonSourceText()) {
    reactRoot.render(<UnsupportedBrowser />);
    return;
  }
  const result = await loadConfig();
  reactRoot.render(
    <StrictMode>
      {result.ok ? <App config={result.config} /> : <ConfigProblem problem={result.problem} />}
    </StrictMode>,
  );
}
