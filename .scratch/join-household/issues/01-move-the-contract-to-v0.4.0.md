# 01: Move the contract to backend v0.4.0

Status: resolved
Blocked by: —
Waits on backend: no. v0.4.0 is released (https://github.com/mumia/wallet-accountant/releases/tag/v0.4.0).

## What to build

The backend released **v0.4.0**, the contract for joining a Household. Its spec is `../wallet-accountant/.scratch/join-household/spec.md`, and the contract work was its ticket 01. Move `src/api/CONTRACT_VERSION` from `v0.3.0` to `v0.4.0` with `make contract-update ref=v0.4.0`, and absorb the two breaking changes. The new screens (Invite, members, `/join`) come from a UI spec for joining that hasn't been written yet. This ticket only keeps the app working against v0.4.0.

### Breaking change 1: `/register` must send a display name

`Registration.display_name` is now **required**:

- It is 1–64 characters. The backend trims it, and it needn't be unique.
- A missing, empty or longer value gets 400 from the schema.
- A name of only spaces gets 422 `/problems/invalid-user` ("Invalid User" / "The display name must not be blank.").
- This applies to the bootstrap code too.

Against a v0.4.0 backend, today's `/register` form (`src/features/first-run/register-page.tsx`) is refused with 400 `Invalid value for: display_name.`. So is the real-stack smoke test (ticket 21 of `.scratch/first-ui-slice`), which redeems through that page.

- [x] `/register` gets a **Display name** field (required, max 64, trimmed before checking that it isn't blank) next to **Invitation code**. The 422 `invalid-user` shows as the form alert, like the 422 `invalid-invitation` already does. `?invitation_code=` prefill is unchanged
- [x] The mock's `POST /registrations` (`src/mocks/handlers.ts`) requires `display_name`, answers 422 `invalid-user` for one of only spaces, and returns it on `Me`
- [x] Tests: `src/api/auth.test.ts`'s registration body, the `first-run` e2e (fill the name; the blank-name problem), and the real-stack smoke test types a name

### Breaking change 2: `Notification` fields are now optional

`statement_import_id`, `connection_id`, `account_id` and `suspected_duplicates` are **no longer required**: they are present only on `SUSPECTED_DUPLICATES_FOUND`. `kind` gains `MEMBER_JOINED`, `MEMBER_LEFT` and `MEMBER_REMOVED`, which carry `member` (and, for removal, `removed_by`). Both are `UserRef { user_id, display_name? }`.

- [x] `src/features/shell/notifications-bell.tsx` compiles with the optional fields. It should read `account_id` and `suspected_duplicates` only for `SUSPECTED_DUPLICATES_FOUND`, which is the only kind `notificationKinds` knows today. The member kinds keep showing as sent, as any unknown kind does, until the joining spec decides their copy
- [x] The mock's Notifications still type-check

### New in the contract, not used yet

- **New operations, all answering 501 at v0.4.0:**
  - `PATCH /me` (`changeMe`)
  - `POST /memberships` (`createMembership`)
  - `GET`/`DELETE /households/{id}/members[/{user_id}]`
  - `POST`/`GET /households/{id}/invitations` and `DELETE /households/{id}/invitations/{invitation_id}`

  They start working as the backend's join-household tickets land, with no contract change.
- **`Me.display_name`:** optional, and absent for Users who registered before v0.4.0.
- Nothing here needs mock handlers until the joining spec uses it.

### Done when

- [x] `make check` passes: the contract check against v0.4.0 and the image's `min-api-version` v0.4.0
- [ ] The real-stack smoke test passes against a backend at v0.4.0 or later

## Comments

- 2026-11-23, from the backend: in the contract, a field that is absent is left out rather than sent as `null`, so read `display_name`, `member` and `removed_by` as optional, not nullable. Users who registered before v0.4.0 have no display name until they call `PATCH /me`, which works from the backend's join-household ticket 03.
- 2026-11-24: done in PR #30 (`make check` passed against v0.4.0, with all e2e). The contract has since moved on to v0.6.0. The real-stack smoke test (`make local-smoke`) wasn't run: it refuses to start while the local k3d cluster exists. `smoke/smoke.spec.ts` types a display name, so the next `make local-smoke` checks it.
