import js from "@eslint/js";
import pluginRouter from "@tanstack/eslint-plugin-router";
import prettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";
import i18next from "eslint-plugin-i18next";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// The rules are explained in docs/architecture/conventions.md ("Lint and format").
export default defineConfig(
  globalIgnores(["dist/", "coverage/", "src/routeTree.gen.ts", ".scratch/", "prototypes/"]),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },

  // npm doesn't stop an import of a package that isn't a dependency; this does.
  {
    plugins: { import: importPlugin },
    settings: { "import/resolver": { typescript: true } },
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        { devDependencies: ["*.config.ts", "src/test/**", "**/*.test.{ts,tsx}"] },
      ],
    },
  },

  // The app.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      reactHooks.configs.flat["recommended-latest"],
      jsxA11y.flatConfigs.strict,
      pluginRouter.configs["flat/recommended"],
      i18next.configs["flat/recommended"],
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // Every user-facing string comes from the message files.
      "i18next/no-literal-string": ["error", { mode: "jsx-text-only" }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**"],
    rules: { "i18next/no-literal-string": "off" },
  },

  // The by-feature layout: a feature never reaches into another feature.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: true },
      // Each folder is an element; the first matching descriptor wins, so `src` (main.tsx
      // and the generated route tree) comes last.
      "boundaries/elements": [
        { type: "app", pattern: "src/app", partialMatch: false },
        { type: "routes", pattern: "src/routes", partialMatch: false },
        { type: "feature", pattern: "src/features/*", partialMatch: false, capture: ["feature"] },
        { type: "ui", pattern: "src/components/ui", partialMatch: false },
        { type: "component", pattern: "src/components", partialMatch: false },
        { type: "api", pattern: "src/api", partialMatch: false },
        { type: "lib", pattern: "src/lib", partialMatch: false },
        { type: "locales", pattern: "src/locales", partialMatch: false },
        { type: "test", pattern: "src/test", partialMatch: false },
        { type: "root", pattern: "src", partialMatch: false },
      ],
      "boundaries/files": [{ pattern: "**/*.test.{ts,tsx}", category: "test" }],
    },
    rules: {
      "boundaries/no-unknown-files": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "root" } },
              allow: { to: { element: { types: ["app", "root", "routes"] } } },
            },
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: [
                      "app",
                      "root",
                      "routes",
                      "feature",
                      "component",
                      "ui",
                      "api",
                      "lib",
                      "locales",
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: "routes" } },
              allow: {
                to: { element: { types: ["app", "feature", "component", "ui", "api", "lib"] } },
              },
            },
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { types: ["component", "ui", "api", "lib"] } } },
            },
            {
              from: { element: { type: "feature" } },
              allow: {
                to: {
                  element: {
                    type: "feature",
                    captured: { feature: "{{ from.element.captured.feature }}" },
                  },
                },
              },
            },
            {
              from: { element: { type: "component" } },
              allow: { to: { element: { types: ["component", "ui", "api", "lib"] } } },
            },
            {
              from: { element: { type: "ui" } },
              allow: { to: { element: { types: ["ui", "lib"] } } },
            },
            {
              from: { element: { type: "api" } },
              allow: { to: { element: { types: ["api", "lib"] } } },
            },
            {
              from: { element: { type: "lib" } },
              allow: { to: { element: { types: ["lib", "api"] } } },
            },
            // Tests set the app up the way it boots.
            {
              from: { file: { categories: "test" } },
              allow: { to: { element: { types: ["app", "test"] } } },
            },
            {
              from: { element: { type: "test" } },
              allow: { to: { element: { types: ["app", "lib"] } } },
            },
          ],
        },
      ],
    },
  },

  {
    files: ["*.config.ts"],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
