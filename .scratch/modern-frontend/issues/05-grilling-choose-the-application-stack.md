# Grilling: choose the application stack

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Given the research, which stack do we build on: framework and build tool, router, server-state caching, API client generator, forms and validation, tables, and the i18n library (English only at launch, adding a language must be easy)?

Also decide the TypeScript version (6 vs 7): research found TS 7 breaks the openapi-typescript and Hey API generators and typescript-eslint until 7.1, so it constrains the generator choice.

## Answer

Decided with the user on 2026-11-17, building on [Research: framework and build tooling](01-research-framework-and-build-tooling.md) and [Research: typed API client from OpenAPI](02-research-typed-api-client-from-openapi.md).

| Concern | Choice | Why, in short |
|---|---|---|
| Framework + build | **React 19 + Vite 8**, static SPA build | Largest ecosystem and agent familiarity; both design-system finalists are React-only; plain TS checks everything. |
| Language | **TypeScript 6**, strictest settings | TS 7 breaks typescript-eslint and openapi-typescript until 7.1 restores the compiler API. Move to 7.1 once the tools support it. |
| Routing | **TanStack Router**, search params validated with **Zod 4** | Type-checked routes, links, path and search params; suits filter/sort/page-heavy tables. |
| Server state | **TanStack Query 5** | Standard; the API client's Query bindings build on it. |
| API client | **openapi-typescript + openapi-fetch + openapi-react-query** | Types-only, ~2.6 kB, clean under strict TS. Contract committed as a copy pinned to a backend SHA; CI fails on drift of the copy or the generated types. Fallback if it goes unmaintained: Orval. |
| i18n | **react-i18next**, type-safe keys, JSON per language | Mainstream, no build step. Money, numbers and dates are formatted with `Intl`, not the i18n library. |
| Forms + validation | **React Hook Form + Zod 4** | Most used; shadcn/ui's form parts target it, works with Mantine; one Zod schema validates and types a form. |
| Tables | **TanStack Table** (+ **TanStack Virtual** for long lists) | Headless, fits either design system. [Prototype: look and feel](09-prototype-look-and-feel.md) only checks whether `mantine-datatable` beats it if Mantine wins. |
| Sign-in | **oidc-client-ts 3.5 + react-oidc-context** | As recommended by [Research: signing in to Zitadel](03-research-signing-in-to-zitadel-from-a-browser-app.md); refresh tokens, `sessionStorage`. |
| Client-only state | **None**: no Zustand/Redux | Server data in Query, view state in the URL, form state in React Hook Form, session in react-oidc-context, the rest in React state/context. Add a library only on real need. |

Left to other tickets: how `Money.amount` travels (string vs JSON reviver) in [Grilling: exact money in the browser](06-grilling-exact-money-in-the-browser.md) (works with this client either way); the design system in [Prototype: look and feel](09-prototype-look-and-feel.md); package manager, lint, tests and CI in [Grilling: repo conventions and tooling](10-grilling-repo-conventions-and-tooling.md).

No backend changes.
