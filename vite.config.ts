import { existsSync, readFileSync } from "node:fs";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The dev loop (docs/architecture/conventions.md, "Commands"): HTTPS on
// https://localhost:5173 with the certificate from `make dev-cert`, and /api
// forwarded unchanged to the API, the local cluster's by default.
const certificate = { cert: ".certs/localhost.pem", key: ".certs/localhost-key.pem" };
const https =
  existsSync(certificate.cert) && existsSync(certificate.key)
    ? { https: { cert: readFileSync(certificate.cert), key: readFileSync(certificate.key) } }
    : {};

export default defineConfig({
  // The router plugin reads tsr.config.json and must come before React's.
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react()],
  server: {
    port: 5173,
    strictPort: true,
    ...https,
    proxy: {
      "/api": {
        target: process.env["API_PROXY_TARGET"] ?? "https://wallet.localhost:18443",
        // The cluster's gateway routes by host name.
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
});
