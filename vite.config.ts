import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// The dev loop (docs/architecture/conventions.md, "Commands"): HTTPS on
// https://localhost:5173 with the certificate from `make dev-cert`, and /api
// forwarded unchanged to the API, the local cluster's by default.
const certificate = { cert: ".certs/localhost.pem", key: ".certs/localhost-key.pem" };
const https =
  existsSync(certificate.cert) && existsSync(certificate.key)
    ? { https: { cert: readFileSync(certificate.cert), key: readFileSync(certificate.key) } }
    : {};

/**
 * MSW's service worker, served and built only in mock mode, so the real build
 * never ships it. It comes from the installed msw, so it always matches it.
 */
function mockServiceWorker(): Plugin {
  const source = () =>
    readFileSync(createRequire(import.meta.url).resolve("msw/mockServiceWorker.js"), "utf8");
  return {
    name: "mock-service-worker",
    configureServer(server) {
      server.middlewares.use("/mockServiceWorker.js", (_request, response) => {
        response.setHeader("Content-Type", "text/javascript");
        response.end(source());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "mockServiceWorker.js", source: source() });
    },
  };
}

export default defineConfig(({ mode, isPreview }) => ({
  plugins: [
    // The router plugin reads tsr.config.json and must come before React's.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    ...(mode === "mock" ? [mockServiceWorker()] : []),
  ],
  // shadcn/ui parts import from "@/…"; our own code uses relative imports.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // The mock build (for e2e) never mixes with the real one.
  build: { outDir: mode === "mock" ? "dist-mock" : "dist" },
  server: {
    port: 5173,
    strictPort: true,
    // HTTPS for the dev server only; preview serves e2e over plain HTTP.
    ...(isPreview === true ? {} : https),
    proxy: {
      "/api": {
        target: process.env["API_PROXY_TARGET"] ?? "https://wallet.localhost:18443",
        // The cluster's gateway routes by host name.
        changeOrigin: true,
      },
    },
  },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
