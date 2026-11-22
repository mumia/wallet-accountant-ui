// Bulk selection (spec, "Accessibility": bulk selection): which rows are
// selected after a checkbox is clicked, Shift+click selecting a range.

/** What a list's header checkbox shows for the rows `ids`. */
export function headerState(
  selected: ReadonlySet<string>,
  ids: readonly string[],
): "none" | "some" | "all" {
  const count = ids.filter((id) => selected.has(id)).length;
  return count === 0 ? "none" : count === ids.length ? "all" : "some";
}

/**
 * The selection after the row `clicked` (among `ids`, in list order) is set to
 * `checked`. With `shift` and an `anchor` in the same list, every row from the
 * anchor to the clicked row is set the same way.
 */
export function clickRow(
  selected: ReadonlySet<string>,
  ids: readonly string[],
  clicked: string,
  checked: boolean,
  shift: boolean,
  anchor: string | undefined,
): Set<string> {
  const next = new Set(selected);
  const to = ids.indexOf(clicked);
  const from = shift && anchor !== undefined ? ids.indexOf(anchor) : -1;
  const range =
    from === -1 || to === -1 ? [clicked] : ids.slice(Math.min(from, to), Math.max(from, to) + 1);
  for (const id of range) {
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}

/** The selection after a header checkbox for `ids` is clicked: all, or none when all were. */
export function clickHeader(selected: ReadonlySet<string>, ids: readonly string[]): Set<string> {
  const next = new Set(selected);
  const all = headerState(selected, ids) === "all";
  for (const id of ids) {
    if (all) {
      next.delete(id);
    } else {
      next.add(id);
    }
  }
  return next;
}
