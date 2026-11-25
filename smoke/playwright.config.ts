import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

// The real-stack smoke test (`make local-smoke`, smoke/smoke.sh): Playwright's
// image on the k3d cluster's Docker network, against this UI's image in the
// cluster. global-setup.ts forwards the ingress so the browser keeps the real
// origins, and the browser trusts only certificates checked against the mkcert
// CA (tls-pin.ts). A failed run leaves its trace and screenshot in
// WA_RESULTS_DIR.
const pins = execFileSync(
  process.execPath,
  [fileURLToPath(new URL("tls-pin.ts", import.meta.url))],
  {
    encoding: "utf8",
  },
);

export default defineConfig({
  testDir: ".",
  testMatch: "smoke.spec.ts",
  globalSetup: fileURLToPath(new URL("global-setup.ts", import.meta.url)),
  outputDir: process.env["WA_RESULTS_DIR"] ?? "test-results",
  reporter: [["list"]],
  timeout: 300_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The dates the test types and reads (smoke.spec.ts).
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: [`--ignore-certificate-errors-spki-list=${pins}`] },
      },
    },
  ],
});
