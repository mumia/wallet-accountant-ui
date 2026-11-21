import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (docs/architecture/conventions.md, "Testing"): the mock build
// (`npm run build:mock`) served by `vite preview`, in Playwright's official
// image (`make e2e`), with an axe scan per screen and state.
const ci = process.env["CI"] !== undefined;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview:mock",
    url: "http://localhost:4173",
    reuseExistingServer: false,
  },
});
