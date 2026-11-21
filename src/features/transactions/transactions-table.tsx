import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CategoryPicker } from "../../components/category-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { flattenCategories, isUncategorised, type CategoryNode } from "../../lib/categories";
import type { IsoDate } from "../../lib/date";
import { fromIsoDate } from "../../lib/date";
import { formatMoney } from "../../lib/money";
import { useChangeCategory, type AccountTransaction } from "./transactions-query";

const features = tableFeatures({});
const column = createColumnHelper<typeof features, AccountTransaction>();
const rowHeight = 57;

const mediumDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(fromIsoDate(date as IsoDate));

/** How a row is named: "Mar 12, 2026, Albert Heijn, -€23.40". */
export function rowLabel(transaction: AccountTransaction): string {
  return [
    mediumDate(transaction.booking_date),
    transaction.description,
    formatMoney(transaction.amount),
  ].join(", ");
}

/**
 * The Transaction list (spec, "Transactions"): Booking date (with the
 * Transaction date under it when different), Description, signed Amount, and
 * a Category picker that saves on pick. `virtual` renders only the rows near
 * the viewport, for all months.
 */
export function TransactionsTable({
  householdId,
  accountId,
  transactions,
  categories,
  virtual = false,
  onNearEnd,
}: {
  householdId: string;
  accountId: string;
  transactions: AccountTransaction[];
  categories: CategoryNode[] | undefined;
  virtual?: boolean;
  /** Called when the last rows come near the viewport, to load more. */
  onNearEnd?: () => void;
}) {
  const { t } = useTranslation("transactions");
  const { mutate: changeCategory } = useChangeCategory(householdId, accountId);
  const kinds = useMemo(
    () => new Map(flattenCategories(categories ?? []).map((category) => [category.id, category])),
    [categories],
  );

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor("booking_date", {
          header: () => t("columns.date"),
          cell: ({ row: { original } }) => (
            <div className="grid">
              <span>{mediumDate(original.booking_date)}</span>
              {original.transaction_date !== original.booking_date && (
                <span className="text-xs text-muted-foreground">
                  {t("transactionDate", { date: mediumDate(original.transaction_date) })}
                </span>
              )}
            </div>
          ),
        }),
        column.accessor("description", {
          header: () => t("columns.description"),
          cell: ({ row: { original } }) => (
            <div className="grid">
              <span className="whitespace-normal">{original.description}</span>
              {original.reversed_by_transaction_id !== undefined && (
                <span className="text-xs text-muted-foreground">{t("reversed")}</span>
              )}
            </div>
          ),
        }),
        column.accessor("amount", {
          header: () => <span className="block text-right">{t("columns.amount")}</span>,
          cell: ({ row: { original } }) => (
            <span className="block text-right tabular-nums">{formatMoney(original.amount)}</span>
          ),
        }),
        column.accessor("category_id", {
          header: () => t("columns.category"),
          cell: ({ row: { original } }) => {
            const category = kinds.get(original.category_id);
            // The Opening balance, reversals and reversed rows can't change Category.
            const fixed =
              original.reversal_of_transaction_id !== undefined ||
              original.reversed_by_transaction_id !== undefined ||
              category === undefined ||
              (category.kind === "INTERNAL" && !isUncategorised(category));
            if (fixed || categories === undefined) {
              return <span>{original.category_name}</span>;
            }
            return (
              <div className="min-w-56">
                <CategoryPicker
                  id={`category-${original.transaction_id}`}
                  label={{ text: t("categoryFor", { row: rowLabel(original) }) }}
                  categories={categories}
                  value={original.category_id}
                  onValueChange={(categoryId) => {
                    const picked = categoryId === null ? undefined : kinds.get(categoryId);
                    if (picked === undefined || picked.id === original.category_id) {
                      return;
                    }
                    changeCategory({
                      transaction: original,
                      categoryId: picked.id,
                      categoryName: picked.name,
                      rowLabel: rowLabel(original),
                    });
                  }}
                />
              </div>
            );
          },
        }),
      ]),
    [categories, changeCategory, kinds, t],
  );

  const table = useTable({
    features,
    columns,
    data: transactions,
    getRowId: (transaction) => transaction.transaction_id,
  });
  const rows = table.getRowModel().rows;

  // All months: only the rows near the viewport are in the page.
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Where the rows start on the page, measured once.
  useEffect(() => {
    setScrollMargin((bodyRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: virtual ? rows.length : 0,
    estimateSize: () => rowHeight,
    overscan: 10,
    scrollMargin,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? -1;
  useEffect(() => {
    if (virtual && lastIndex >= rows.length - 20) {
      onNearEnd?.();
    }
  }, [virtual, lastIndex, rows.length, onNearEnd]);

  const shown = virtual
    ? items.map((item) => rows[item.index]).filter((row) => row !== undefined)
    : rows;
  const before = virtual ? (items[0]?.start ?? 0) - virtualizer.options.scrollMargin : 0;
  const after = virtual ? virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0) : 0;

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} className="first:pl-4 last:pr-4">
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody ref={bodyRef}>
        {before > 0 && (
          <tr aria-hidden="true">
            <td colSpan={4} style={{ height: before }} />
          </tr>
        )}
        {shown.map((row) => (
          <TableRow key={row.id} style={{ height: rowHeight }}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
        {after > 0 && (
          <tr aria-hidden="true">
            <td colSpan={4} style={{ height: after }} />
          </tr>
        )}
      </TableBody>
    </Table>
  );
}
