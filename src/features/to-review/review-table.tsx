import { CopyIcon, LockIcon } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { CategoryPicker } from "../../components/category-picker";
import { mediumDate, rowLabel } from "../../components/row-label";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useWindowRows } from "../../components/use-window-rows";
import type { CategoryNode } from "../../lib/categories";
import { formatMoney } from "../../lib/money";
import { clickHeader, clickRow, headerState } from "../../lib/selection";
import type { ImportedTransaction } from "./to-review-query";

/** The Imported transaction states the contract lists; others are shown as sent. */
export const importedStates = ["PENDING", "SUSPECTED_DUPLICATE", "ACCEPTED", "DISCARDED"] as const;
type KnownState = (typeof importedStates)[number];
const isKnownState = (state: string): state is KnownState =>
  (importedStates as readonly string[]).includes(state);

const checkboxClass = "size-4 cursor-pointer accent-primary align-middle";

/** A plain checkbox whose mixed state is set on the element, as HTML has no attribute for it. */
function HeaderCheckbox({
  label,
  state,
  onClick,
}: {
  label: string;
  state: "none" | "some" | "all";
  onClick: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current !== null) {
      ref.current.indeterminate = state === "some";
    }
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      className={checkboxClass}
      checked={state === "all"}
      onChange={onClick}
    />
  );
}

/** The dashed "Resembles" box: the earlier row, each field that differs marked in text. */
function Resembles({ row }: { row: ImportedTransaction }) {
  const { t } = useTranslation("toReview");
  const earlier = row.resembles;
  if (earlier === undefined) {
    return null;
  }
  const part = (text: string, differs: boolean) => (
    <span className={differs ? "font-medium text-foreground" : undefined}>
      {text}
      {differs && ` ${t("differs")}`}
    </span>
  );
  return (
    <span className="mt-1 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
      <CopyIcon aria-hidden="true" className="size-3 shrink-0" />
      {t("resembles")}{" "}
      {part(mediumDate(earlier.booking_date), earlier.booking_date !== row.booking_date)}
      {" · "}
      {part(earlier.description, earlier.description !== row.description)}
      {" · "}
      {part(formatMoney(earlier.amount), earlier.amount.amount !== row.amount.amount)}
      {" · "}
      <span>{isKnownState(earlier.state) ? t(`states.${earlier.state}`) : earlier.state}</span>
    </span>
  );
}

export interface ReviewTableProps {
  section: "suspected" | "pending";
  rows: ImportedTransaction[];
  selected: ReadonlySet<string>;
  onSelectionChange: (selected: Set<string>) => void;
  /** Pending only: the Household's Categories, for each row's picker. */
  categories?: CategoryNode[] | undefined;
  /** Pending only: the Category a row's Accept sends. */
  categoryOf?: (row: ImportedTransaction) => string | undefined;
  onCategoryChange?: (row: ImportedTransaction, categoryId: string) => void;
  onAccept?: (row: ImportedTransaction) => void;
  onKeep?: (row: ImportedTransaction) => void;
  onDiscard: (row: ImportedTransaction) => void;
  /** Rows being decided: their buttons wait. */
  busy?: ReadonlySet<string>;
  /**
   * Why a row can't be decided yet ("November 2026 isn't open yet"), or
   * undefined when it can. A locked row has no actions and can't be selected.
   */
  lockOf?: (row: ImportedTransaction) => string | undefined;
  virtual?: boolean;
  onNearEnd?: () => void;
}

/**
 * One section of To review (spec, "To review"): a checkbox labelled from each
 * row (Shift+click selects a range), Booking date, payee and description with
 * the Resembles box, amount, the Category picker (Pending only) and the row's
 * actions. Rows keep the API's order; there is no column sorting.
 */
export function ReviewTable({
  section,
  rows,
  selected,
  onSelectionChange,
  categories,
  categoryOf,
  onCategoryChange,
  onAccept,
  onKeep,
  onDiscard,
  busy = new Set(),
  lockOf = () => undefined,
  virtual = false,
  onNearEnd,
}: ReviewTableProps) {
  const { t } = useTranslation("toReview");
  // Locked rows stay out of the selection, so bulk actions never reach them.
  const ids = rows
    .filter((row) => lockOf(row) === undefined)
    .map(({ imported_transaction_id }) => imported_transaction_id);
  // The row a Shift+click range starts from.
  const anchor = useRef<string | undefined>(undefined);
  const pending = section === "pending";
  const columnCount = pending ? 6 : 5;
  const { bodyRef, indexes, before, after, measure } = useWindowRows({
    count: rows.length,
    estimate: 64,
    virtual,
    onNearEnd,
  });

  const onRowClick = (id: string) => (event: MouseEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    onSelectionChange(clickRow(selected, ids, id, checked, event.shiftKey, anchor.current));
    anchor.current = id;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 pl-4">
            <HeaderCheckbox
              label={t(`selectAll.${section}`)}
              state={headerState(selected, ids)}
              onClick={() => {
                onSelectionChange(clickHeader(selected, ids));
              }}
            />
          </TableHead>
          <TableHead>{t("columns.date")}</TableHead>
          <TableHead>{t("columns.description")}</TableHead>
          <TableHead className="text-right">{t("columns.amount")}</TableHead>
          {pending && <TableHead>{t("columns.category")}</TableHead>}
          <TableHead className="pr-4">
            <span className="sr-only">{t("columns.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody ref={bodyRef}>
        {before > 0 && (
          <tr aria-hidden="true">
            <td colSpan={columnCount} style={{ height: before }} />
          </tr>
        )}
        {indexes.map((index) => {
          const row = rows[index];
          if (row === undefined) {
            return null;
          }
          const id = row.imported_transaction_id;
          const label = rowLabel(row);
          const waiting = busy.has(id);
          const lock = lockOf(row);
          return (
            <TableRow
              key={id}
              data-index={index}
              ref={measure}
              data-state={selected.has(id) ? "selected" : undefined}
            >
              <TableCell className="pl-4 align-top">
                {/* The click, not the change, carries Shift. */}
                <input
                  type="checkbox"
                  aria-label={t("selectRow", { row: label })}
                  className={checkboxClass}
                  checked={selected.has(id)}
                  disabled={lock !== undefined}
                  onClick={onRowClick(id)}
                  onChange={() => undefined}
                />
              </TableCell>
              <TableCell className="align-top">
                <div className="grid">
                  <span>{mediumDate(row.booking_date)}</span>
                  {row.transaction_date !== row.booking_date && (
                    <span className="text-xs text-muted-foreground">
                      {t("transactionDate", { date: mediumDate(row.transaction_date) })}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-normal">
                <div className="grid min-w-48 justify-items-start">
                  <span className="font-medium">{row.payee ?? row.description}</span>
                  {row.payee !== undefined && (
                    <span className="text-xs text-muted-foreground">{row.description}</span>
                  )}
                  <Resembles row={row} />
                </div>
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {formatMoney(row.amount)}
              </TableCell>
              {pending && (
                <TableCell className="align-top">
                  {lock === undefined && categories !== undefined && categoryOf !== undefined && (
                    <div className="min-w-56">
                      <CategoryPicker
                        id={`review-category-${id}`}
                        label={{ text: t("categoryFor", { row: label }) }}
                        categories={categories}
                        value={categoryOf(row) ?? null}
                        onValueChange={(categoryId) => {
                          if (categoryId !== null) {
                            onCategoryChange?.(row, categoryId);
                          }
                        }}
                      />
                    </div>
                  )}
                </TableCell>
              )}
              <TableCell className="pr-4 align-top">
                {lock !== undefined ? (
                  <p className="text-right text-sm whitespace-normal text-muted-foreground">
                    <LockIcon aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px]" />
                    {lock}
                  </p>
                ) : (
                  <div className="flex justify-end gap-2">
                    {pending ? (
                      <Button
                        size="sm"
                        disabled={waiting}
                        aria-label={t("acceptRow", { row: label })}
                        onClick={() => onAccept?.(row)}
                      >
                        {t("accept")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={waiting}
                        aria-label={t("keepRow", { row: label })}
                        onClick={() => onKeep?.(row)}
                      >
                        {t("keep")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={waiting}
                      aria-label={t("discardRow", { row: label })}
                      onClick={() => {
                        onDiscard(row);
                      }}
                    >
                      {t("discard")}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
        {after > 0 && (
          <tr aria-hidden="true">
            <td colSpan={columnCount} style={{ height: after }} />
          </tr>
        )}
      </TableBody>
    </Table>
  );
}
