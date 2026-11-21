# Statement import flow

Status: open
Blocked by: 08
Waits on backend: mostly no. The Connection radio list shows Connection names, which arrive with ticket 11's backend change; until then, label Connections behind one marked seam. The note on rows ignored in closed months waits on the month rules.

## What to build

- The stepper at `…/statement-imports/new`: Connection, then File and Export balance, then the Opening balance preview on a first import, then the Result. `?connection_id=` skips step 1.
- The double Export balance entry with paste blocked on the first import. Preview and Confirm each get their own Idempotency-Key.
- Refusals rendered by the problem's fields: `rows` as a table, the balance fields as three amounts with hints, `statement_import_id` as a link to the earlier import, anything else as `title` + `detail`.
- Notifications are polled at about 3 s and 10 s after an import, once ticket 14 exists.

## Acceptance criteria

- [ ] E2e covers a first import with a preview, a later import, and each refusal shape. axe passes.

## Spec

[spec.md](../../modern-frontend/spec.md): user stories 24–28; Statement import flow.
