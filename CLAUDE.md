# wallet-accountant-ui

The frontend for Wallet Accountant. The backend lives in a separate repo, `wallet-accountant` (locally `../wallet-accountant`), and its OpenAPI document `api/openapi.yaml` is the contract between the two (backend ADR-0008).

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

This repo has no glossary of its own. It uses the backend's domain language exactly: start at `../wallet-accountant/CONTEXT-MAP.md`, which points to each bounded context's `CONTEXT.md`. Screen labels and code names use those terms (Household, Account, Category, Imported transaction, Accept, Month close, …). Add a `CONTEXT.md` here only for terms that exist in the UI alone.

### Languages

Any JavaScript is TypeScript, as strictly typed as the tooling allows.
