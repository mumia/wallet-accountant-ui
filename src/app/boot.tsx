import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { supportsJsonSourceText } from "../api/exact-json";
import { App } from "./app";
import { ConfigProblem } from "./config-problem";
import { loadConfig } from "./config";
import { initI18n } from "./i18n";
import "./theme/index.css";
import { appearanceStore } from "../lib/theme/appearance";
import { UnsupportedBrowser } from "./unsupported-browser";

/**
 * Starts the app: the saved appearance first (so nothing flashes), the mock API
 * in mock mode, messages, then the browser check (amounts must be exact,
 * ADR-0002), then /config.json, then the app.
 */
export async function boot(root: HTMLElement): Promise<void> {
  appearanceStore.start();
  // A `--mode mock` build only: Vite drops this branch, and the mocks with it, otherwise.
  if (import.meta.env.MODE === "mock") {
    const { startMockApi } = await import("../mocks/browser");
    await startMockApi();
  }
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
