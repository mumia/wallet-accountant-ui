# Research: framework and build tooling for a static, strict-TypeScript web app

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: research
Status: resolved
Blocked by:

## Question

Which frontend framework and build tooling fit a static-build, desktop-first web app with lots of data (tables, forms), written in the strictest TypeScript, for a team that is not frontend-specialised and leans on docs, community and coding agents?

Compare React, Vue, Svelte and Solid, each with Vite as the build tool, on: TypeScript strictness and type inference end to end (props, routes, forms); maturity and size of the ecosystem (component libraries, tables, forms); quality of docs and agent familiarity; long-term stability. For the leading candidate(s), compare the router options with an eye on type-safe routes and search params (e.g. TanStack Router vs React Router), and the server-state caching options (e.g. TanStack Query).

Also survey i18n libraries for the leading candidate(s) (e.g. react-i18next, FormatJS / react-intl, Lingui, Paraglide): type-safe message keys, ICU plurals, how easy it is to add a new language, bundle size.

Findings feed [Grilling: choose the application stack](05-grilling-choose-the-application-stack.md).

## Answer

Findings: `research/framework-and-build-tooling.md` on branch `research/framework-and-build-tooling` (not pushed). Versions as of 2026-11-17, each claim sourced.

**Recommendation (not final): React 19 + Vite 8 + TanStack Router + TanStack Query + react-i18next.**

- **Build tool:** Vite 8.3.8 is the default for all four frameworks, so it doesn't separate them; a plain Vite SPA build is static.
- **Framework:** React 19.3 leads clearly on ecosystem and agent familiarity, and plain TypeScript checks all of it, including TypeScript 7 (Go-based compiler, GA July 2026). Vue and Svelte templates can't be checked by TS 7 until 7.1 restores the compiler API. Vue is a reasonable second (typed query params still experimental). Solid 2.0 shipped today and Svelte 5 changed its API recently, so agent-written code is less reliable.
- **Router:** TanStack Router 1.170 over React Router 8: type-checked routes, links, path params and search params (validated with Zod 4), which suits filter/sort/page-heavy tables, and builds a plain static app. React Router's typing needs framework mode, and its docs don't cover typed search params.
- **Server state:** TanStack Query 5.108, the standard choice and recommended by React's docs.
- **i18n:** leaning react-i18next (mainstream, no build step, type-safe keys, a new language is a new JSON folder; ~26 kB gzip, own plural format, not ICU). Close alternative: Lingui (real ICU, ~2 kB runtime, PO files). Paraglide is the most type-safe but changed owner and shipped a breaking v3 this month.

**Open questions for [Grilling: choose the application stack](05-grilling-choose-the-application-stack.md):** react-i18next vs Lingui; whether to stay on TypeScript 6 until 7.1 restores the compiler API that tools like typescript-eslint need.
