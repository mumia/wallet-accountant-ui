# Statement import flow

Status: done
Blocked by: 08
Waits on backend: mostly no. The Connection radio list shows Connection names, which arrive with ticket 11's backend change; until then, label Connections behind one marked seam. The note on rows ignored in closed months waits on the month rules.

## What to build

- The stepper at `…/statement-imports/new`: Connection, then File and Export balance, then the Opening balance preview on a first import, then the Result. `?connection_id=` skips step 1.
- The double Export balance entry with paste blocked on the first import. Preview and Confirm each get their own Idempotency-Key.
- Refusals rendered by the problem's fields: `rows` as a table, the balance fields as three amounts with hints, `statement_import_id` as a link to the earlier import, anything else as `title` + `detail`.
- Notifications are polled at about 3 s and 10 s after an import, once ticket 14 exists.

## Acceptance criteria

- [x] E2e covers a first import with a preview, a later import, and each refusal shape. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 24–28; Statement import flow.

## Notes

- From ticket 08: `…/accounts/$accountId/statement-imports/new.tsx` is a stub with `validateSearch` for `connection_id`; the Account header's "Import statement" and the checklist's step 2 link to it.

## Answer

Landed on 2026-11-22.

- **The flow** (`features/statement-import/`) is one page with a stepper (`aria-current="step"`, "(done)" for screen readers). Each step's card takes focus when it opens. Everything typed stays in page memory: Back keeps it, a reload starts over.
  - **Connection** (`connection-step.tsx`): skipped when the Account has exactly one Connection and it has a mapping. Otherwise a radio list, preselecting the latest import's Connection (`useLatestImportConnection` reads each Connection's imports). A Connection without a mapping is disabled, with "Needs a CSV mapping" and "Edit Connection N". With none: "This Account has no Connection yet" and "Create a Connection".
  - **The deep link**: `?connection_id=` skips the step. The file step reads "Through Connection 1 · Change"; Change (only with several Connections) drops the parameter, which starts the flow over (the page is keyed on it). A `connection_id` that isn't a usable Connection of the Account is ignored.
  - **File and Export balance** (`file-step.tsx`): a drop zone with a visible "Choose a file" / "Replace file" button (the real file input, so the keyboard path is native). Dropping is wired by listeners in a hook, because the zone itself isn't interactive. Only a zero-byte file is refused in the browser.
  - **The amounts**: the Export balance with the spec's help text. On a first import, "Export balance, again", which refuses pastes. Checks run on blur and submit, never while typing. A changed value drops its error at once, so the button doesn't move under the pointer between mousedown and mouseup (that lost clicks).
  - **Preview** (`preview-step.tsx`): the Opening balance large, "= Export balance … − rows total …", rows to import, ignored, rows total, file and Connection names, the `row_count` 0 warning and the ignored-rows note.
  - **Result** (`result-step.tsx`): the Balance check (unknown values shown as sent), the four counts, the Opening balance recorded on a first import, and "Review N rows" (with `state=SUSPECTED_DUPLICATE` when there are any) or "Nothing new in this file", and "Back to the Account".
- **Refusals** (`refusal.tsx`, `refusalShape`): the alert of the step that sent the request, read by the problem's fields:
  - `rows`: a Line | Reason table of the first 20 and "and N more", plus "Edit the Connection's CSV mapping";
  - the three balances, with a fixed hint and links to the mapping and the Statement imports;
  - `statement_import_id`: "See the earlier import" (`?statement_import_id=`);
  - anything else: `title` + `detail`.
  - A refusal on Confirm also offers "Back to the file".
- **Writes** (`statement-import-query.ts`): preview and upload are multipart through `fetchClient` with a `FormData` `bodySerializer`.
  - A success refetches the Account, the Accounts list, Imported transactions, Transactions and Statement imports.
  - A refusal refetches the Account, so "Opening balance already recorded" turns the flow into a later import.
- **Supporting changes**:
  - **API types**: `format: binary` is typed `Blob` (`scripts/generate-api.ts`).
  - **Idempotency-Key**: a multipart body is now identified by its parts, since each send gets a new boundary. Without this, a retried upload got a new key. Tested in `api/idempotency.test.ts` (Node environment: jsdom's `File` can't go in Node's `Request`).
  - **Amount input**: now styled with the field parts, and takes `description`, `onBlur` and `onPaste`.
  - **One marked seam** (`components/connection-names.ts`): Connections are named "Connection N" in creation order until the contract has `name` (ticket 11).
  - **Routes**: `toReviewSearch` and `statementImportsSearch`, and a stub `connections/$connectionId`.
  - **The mock**: it reads statement files with the mapping (`mocks/statement-files.ts`) and serves preview, upload and the list with the backend's rules and wording (`mocks/statement-import-handlers.ts`). Main gets two Connections and one earlier import; Credit card's Connection gets a mapping.
- **Not yet**: Notifications polled at about 3 s and 10 s after an import wait for ticket 14 (noted there). The closed-months ignored count waits for the contract (noted on ticket 16).
- **e2e** (`e2e/statement-import.spec.ts`, 5 tests, axe on each state):
  - a first import: empty submit, a zero-byte file, a mismatch on blur, the preview, Back keeping the input, Confirm and the result;
  - a later import: the Connection list with preselection and a disabled Connection, a certain repeat, a Suspected duplicate and WAITING;
  - the deep link and Change;
  - each refusal shape: unreadable lines, a failed Balance check fixed by retyping, a duplicate file, an empty file;
  - no Connection.
- **`make check`** passes: lint, typecheck, 363 unit tests, build, audit, contract, 51 e2e tests and the image. One run had a timeout in `categories.spec.ts` ("moves a Category…") under full parallel load. It passed 15 of 15 times alone, and the next full run was green.
