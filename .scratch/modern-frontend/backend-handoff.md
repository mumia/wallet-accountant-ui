# Backend handoff: what the UI's first slice needs from wallet-accountant

Paste everything below the line into a Claude Code session in `wallet-accountant`. Paths are relative to that repo.

---

/grilling

Grill me on the backend changes the Wallet Accountant UI's first slice needs, one area at a time, then use the `domain-modeling` skill to update the glossaries and ADRs they touch. The UI side is already decided. The UI spec is `../wallet-accountant-ui/.scratch/modern-frontend/spec.md`, and each item below links the UI ticket that decided it. Read the ticket before grilling its item. **Take the UI's constraints as fixed**: field names, shapes and the reasons behind them. Push back only if one breaks a backend invariant, and say which one. Everything listed under "Left to the backend" is open for us to decide here. The output is a backend spec (or several) under `.scratch/`, ready for agents, plus a contract change in `api/openapi.yaml` that the UI can pin to a release tag.

Two facts about how the UI reads the API apply to every item:
- The UI keeps **no list of problem types**. It shows a problem's `title` and `detail` to the User verbatim and untranslated, and renders extra fields by their presence (`rows`, `reasons`, `statement_import_id`, `expected_balance`/`export_balance`/`difference`). So problem wording is User-facing copy, and every new problem should carry the data a screen needs as fields.
- `Money.amount` stays a JSON number; the UI reads and writes it exactly. Don't change it.

Already done, so leave it out: `GET /currencies`. Already settled by ADR-0021/0022 and the UI contract: the `web` Zitadel app, `/api`, `/config.json`.

## 1. Month rules: one open month per Account (the biggest change)

Decided in `../wallet-accountant-ui/.scratch/modern-frontend/issues/17-grilling-month-close-reverse-and-void.md` (with an amendment from ticket 11). This **replaces** the first slice's "a closed month can still be changed, but any change is flagged", and lifts two exclusions from its Out of Scope: Reopen and an ordering rule between months. Expect the Ledger glossary's Month close entry to change, and check whether ADR-0018 needs an amendment.

UI constraints (fixed):
- **One open month per Account.** The start date's month opens first. The next month (December rolls into January) opens only when the open month closes. Months close one at a time, with no bulk close.
- **A month closes only once it has ended**: closing the month in progress is refused.
- **A closed month locks money and descriptions.**
  - Accept, Keep, Discard and Reverse of anything booked in it are refused with a new 409 `/problems/month-closed`.
  - A Transaction's Category can still change, but not to Uncategorised: that is refused with a new 422 `/problems/uncategorised-in-closed-month`.
- **Reopen** works only on the latest closed month, and only while the open month has no Accepted Transactions. Reopening makes the month after it Not open yet again, and the month has to be closed again with its Statement balance. `AccountMonth` gets **`reopen_blocked`**, a boolean the UI uses to disable Reopen.
- **`AccountMonth.state`** gains **`NOT_OPEN_YET`**, next to `OPEN` and `CLOSED`. The backend owns this state; the UI never works it out. A future month that holds booked rows (a value date just past today) is a real Not open yet month.
- **`flagged`** is removed from `AccountMonth`.
- **Statement import rows outside the open month**:
  - Rows in a month that isn't open yet land as **pending** Imported transactions. They can't be Accepted, Kept or Discarded until their month opens. The UI shows them, locked.
  - Rows in a closed month are **ignored and counted**, like rows before the start date. The preview and the result report that count, and the UI's "ignored rows" note covers both causes.
- **Void** is refused when any of the import's rows fall in a closed month, with a new 409 `/problems/statement-import-touches-closed-month`.
- **`void_blocked_by`** on `StatementImport` lists the reasons Void is refused right now: `NOT_LATEST`, `HAS_ACCEPTED_ROWS` and `TOUCHES_CLOSED_MONTH`. It is empty when Void is allowed. The UI disables Void from it.
- **`unchecked_statement_imports`** on `AccountMonth`, in the same shape as the `MonthCloseProblem` field. The month screen lists blockers before any close attempt.

Left to the backend:
- How the **Balance check** accounts for rows ignored because their month is closed. This is the main open question.
- The Reopen operation's shape (endpoint, body, the problem it returns when refused) and its event.
- The problem returned when someone acts on a row in a Not open yet month, and the field names for the closed-month ignored count on the preview and the import.
- How the Decider and folds hold "the open month", and what happens to existing data that has `flagged`.
- Whether "closing only once the month has ended" uses the server's clock in UTC or in a Household time zone.

## 2. Overview reads

Decided in `../wallet-accountant-ui/.scratch/modern-frontend/issues/11-grilling-overview-reads-the-backend-must-serve.md`. They exist so that the sidebar and the Accounts overview read only `GET …/accounts`, with no call per Account or per month.

UI constraints (fixed):
- **`GET /households/{household_id}/accounts/{account_id}/months`**:
  - returns every Booking month of the Account as an `AccountMonth`, newest first and unpaged
  - runs from the start date's month to the later of the current calendar month and the last month holding a booked row
  - answers from the Account's creation, before its first Statement import: the start date's month is `OPEN` and the rest are `NOT_OPEN_YET`
- **`pending`** and **`suspected_duplicates`** counts on `Account`, over the whole Account, including months not open yet. Keep the domain terms: the UI adds them up itself as "To review".
- **`open_month`** on `Account`: required, `YYYY-MM`, set to the start date's month at creation.

Left to the backend: how the counts are kept (a fold or a query), and the upper bound if the "last booked row" rule turns out awkward.

## 3. `imported_transaction_id` on `AccountTransaction`

Decided in ticket 17. The Ledger `Transaction` already has this field, but the single-entry `AccountTransaction` row doesn't. The Reverse dialog needs it to say "Its Imported transaction goes back to To review". Left to the backend: nothing beyond adding it.

## 4. Connections and the CSV mapping

Decided in `../wallet-accountant-ui/.scratch/modern-frontend/issues/15-grilling-the-csv-mapping-editor.md`.

UI constraints (fixed):
- **A name on Connection.** `name` is required: 1–100 characters, trimmed, and unique within the Account, ignoring case. It is set on create and can be renamed later. A duplicate name is refused with a 422 problem. The UI always creates a Connection together with its mapping, in one request.
- **An encoding on `CsvMapping`.** `encoding` is an `x-extensible-enum` of UTF-8 and Windows-1252. When it is absent, it means UTF-8, so saved mappings stay valid. The file is decoded before it is parsed.
- **A mapping test endpoint**, for example `POST /households/{household_id}/accounts/{account_id}/csv-mapping-tests`:
  - It takes multipart: an unsaved mapping plus a sample file.
  - It returns the first ~10 rows as the backend parsed them, or the unreadable lines with reasons, in the same `rows` shape as `/problems/unreadable-statement-file`.
  - An invalid mapping gets `/problems/invalid-csv-mapping`.
  - It records nothing and doesn't store the sample. The UI never parses rows itself.
- **Contract only**: list `date_format`, `decimal_separator` and `thousands_separator` as `x-extensible-enum`, instead of only in prose. The UI tests its labels against them.

Left to the backend:
- How a rename travels: a `PATCH` on the Connection, or a field on save.
- The exact spelling of the encoding values.
- The test endpoint's path, how many rows it returns, and its response schema.
- What happens to existing Connections without a name (a migration default?).

## 5. Environment repo `wallet-accountant-deploy`, local values

Decided in `../wallet-accountant-ui/.scratch/modern-frontend/issues/07-grilling-how-the-ui-is-served-next-to-the-api.md`. This is plain config, nothing to grill:
- Add `https://localhost:5173/auth/callback` to `oidc.zitadelSetup.web.extraRedirectUris` and `https://localhost:5173/` to `extraPostLogoutRedirectUris`, for the Vite dev server.
- Set `ui.enabled: true` with the UI image and tag, once the image exists.
- Add the UI image's base image (Caddy) to `images.lock`.

## 6. Rename an Account

Decided in `../wallet-accountant-ui/.scratch/modern-frontend/issues/20-grilling-categories-add-account-and-transactions-tab.md`. Nothing about an Account can change after it is added, so a typo in its name is permanent.

UI constraints (fixed): an Account's `name` can be changed; 1–200 characters, not blank, no uniqueness rule; a blank name is refused with 422 `/problems/invalid-account`. Kind, Account currency and start date stay fixed.

Left to the backend: the operation's shape (e.g. `PATCH /households/{household_id}/accounts/{account_id}` with `name`) and its event.

## Order

Grill area 1 first: areas 2 and 3 depend on its month states. Areas 4 and 6 are independent. Area 5 can be done whenever the UI image exists. When the contract changes are released, tell me the release tag: the UI pins its `openapi.yaml` to it.
