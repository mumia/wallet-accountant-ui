# Grilling: talking to the API

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 

## Question

How does the UI behave around every API call, beyond the generated client itself?

Decide:
- **Errors**: how a problem+json response (`type`, `title`, `detail`, field-level problems, `reasons`) is shown: inline on the form field, as a banner on the screen, or as a toast. Which problem types get their own message, and how messages map into the message files.
- **Idempotency-Keys**: which calls need one per the contract, where the key is generated (when the form opens, or on submit), and how it is kept across a retry or a double click.
- **Cursor pagination**: infinite scroll, "Load more", or pages, given the virtualisation need found in [Prototype: look and feel](09-prototype-look-and-feel.md).
- **Token expiry mid-action**: what happens when the access token or the refresh fails while a form is open or a request is in flight (oidc-client-ts, [Research: signing in to Zitadel from a browser app](03-research-signing-in-to-zitadel-from-a-browser-app.md)).
- **Freshness**: TanStack Query stale times and refetching in general, and how often Notifications are polled for the unread badge.

Work from `../wallet-accountant/api/openapi.yaml` and the backend's conventions on errors, idempotency and pagination.

## Answer

Decided with the user on 2026-11-20, against `../wallet-accountant/api/openapi.yaml`. Facts from the contract: problems are RFC 9457 with no field-level errors (`StatementFileProblem` adds `rows`, `MonthCloseProblem` adds `reasons`, `StatementImportConflictProblem` adds `statement_import_id`); every write takes an optional `Idempotency-Key`; cursor pagination (limit up to 200) exists only on Transactions and Imported transactions; Notifications are one unpaged list, raised a little after their cause by a deferred handler.

### Errors

- **Before sending**: Zod schemas mirror the contract's limits and give per-field messages.
- **A form's request fails**: an alert at the top of that form or dialog; the input is kept.
- **A one-click action fails** (Accept, Keep, Discard, Reverse, mark read): a toast naming the row.
- **A screen's data fails to load**: an inline error in place of the content, with "Try again". A 404 shows "not found" (already decided).
- No separate offline banner: a network failure is handled like any other failure.

### Error text

- Shown **untranslated**, as the backend sends it: the problem's `title` as the heading, its `detail` as the body.
- An error without a problem body (network failure, an empty 5xx) uses a short generic message of ours, from the message files like every other string.
- The UI keeps no list of problem types. Problems with extra data (`rows`, `reasons`, `statement_import_id`) are rendered by the screens that own them, decided in their flow tickets.
- Translating errors is later work, if it is ever needed.

### Idempotency-Key

- Every write sends one.
- It is created on the **first submit**, reused for every retry of the same request, and replaced if the User changes the input after an error (the same key with a different body gets 422).
- One wrapper around writes owns this; no screen handles keys itself.
- The submit button is disabled while a request is in flight.

### Retries

- **Reads**: retry on network errors and 5xx, never on 4xx.
- **Writes**: retry twice, with the same key, on network errors and 502/503/504 only. Never after a 4xx or a 500.

### Long lists (Transactions, Imported transactions)

- **With `booking_month`**: every page of that month loads automatically (limit 200), so filters and counts are exact, including the client-side Uncategorised filter.
- **Without a month**: infinite scroll with virtualisation (TanStack Virtual) and a "Showing N so far" note.
- If this performs poorly, rethink the API's read patterns then.

### Session ending mid-action

- oidc-client-ts renews the access token in the background with the refresh token.
- A 401 triggers one renewal and one resend.
- If renewal fails, a "Your session has ended — Sign in again" dialog redirects to Zitadel and back to the same URL. Input in an open form is lost; a flow ticket may ask for draft saving if it needs it.

### Freshness

- Reads are fresh for about 30 s and refetched on window focus.
- After a write, the reads it affects are invalidated and refetched. No optimistic updates by default; [Grilling: the To review list](14-grilling-the-to-review-list.md) may ask for them.
- **Notifications**: polled every 60 s while the tab is visible, refetched on focus, and again about 3 s and 10 s after a successful Statement import. The unread badge is counted from the list in the browser.
- Updates pushed from the backend (e.g. websockets) are later work, outside this effort.

No backend changes.
