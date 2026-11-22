import { Link } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { cn } from "cn";
import { EllipsisIcon, LockIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CategoryPicker } from "../../components/category-picker";
import { mediumDate, rowLabel } from "../../components/row-label";
import { useWindowRows } from "../../components/use-window-rows";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  flattenCategories,
  isUncategorised,
  type CategoryNode,
  type FlatCategory,
} from "../../lib/categories";
import { formatMonth, monthOf, type Month } from "../../lib/month";
import { formatMoney } from "../../lib/money";
import { ReverseDialog } from "./reverse-dialog";
import { useChangeCategory, type AccountTransaction } from "./transactions-query";

const features = tableFeatures({});
const column = createColumnHelper<typeof features, AccountTransaction>();
const rowHeight = 57;
const columnCount = 5;

/** A reversal or a reversed original: muted, its Category fixed, never Uncategorised. */
export function isReversalPair(transaction: AccountTransaction): boolean {
  return (
    transaction.reversal_of_transaction_id !== undefined ||
    transaction.reversed_by_transaction_id !== undefined
  );
}

/**
 * The Opening balance Transaction, recognised by its Internal "Opening
 * balance" Category: only voiding the first Statement import changes it.
 */
function isOpeningBalance(
  transaction: AccountTransaction,
  category: FlatCategory | undefined,
): boolean {
  return category === undefined
    ? transaction.category_name === "Opening balance"
    : category.kind === "INTERNAL" && category.name === "Opening balance";
}

const rowId = (transactionId: string) => `transaction-${transactionId}`;

/**
 * The Transaction list (spec, "Transactions"): Booking date (with the
 * Transaction date under it when different), Description, signed Amount, a
 * Category picker that saves on pick, and a row menu with Reverse where it
 * applies. Rows before the Account's open month are in a closed month: locked,
 * and their picker never offers Uncategorised. `highlighted` is brought into
 * view and focused. `virtual` renders only the rows near the viewport, for all
 * months.
 */
export function TransactionsTable({
  householdId,
  accountId,
  transactions,
  categories,
  openMonth,
  highlighted,
  virtual = false,
  onNearEnd,
}: {
  householdId: string;
  accountId: string;
  transactions: AccountTransaction[];
  categories: CategoryNode[] | undefined;
  /** The Account's open month: the only one whose Transactions can be reversed. */
  openMonth: Month;
  /** A Transaction to highlight, from `transaction_id` in the URL. */
  highlighted?: string | undefined;
  virtual?: boolean;
  /** Called when the last rows come near the viewport, to load more. */
  onNearEnd?: () => void;
}) {
  const { t } = useTranslation("transactions");
  const { mutate: changeCategory } = useChangeCategory(householdId, accountId);
  const [reversing, setReversing] = useState<AccountTransaction | undefined>();
  const kinds = useMemo(
    () => new Map(flattenCategories(categories ?? []).map((category) => [category.id, category])),
    [categories],
  );
  // flexRender renders each `cell` as a component type, so new columns remount
  // every cell, losing what is being typed in a picker. They must not depend on
  // the rows: a cell reads other rows through its `table`.
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
          cell: ({ row: { original }, table: current }) => {
            const reversedBy = original.reversed_by_transaction_id;
            const reversalOf = original.reversal_of_transaction_id;
            const originalRow =
              reversalOf === undefined
                ? undefined
                : current.getRowModel().rowsById[reversalOf]?.original;
            return (
              <div className="grid justify-items-start gap-0.5">
                <span className="whitespace-normal">{original.description}</span>
                {reversedBy !== undefined && (
                  <TransactionLink
                    householdId={householdId}
                    accountId={accountId}
                    transactionId={reversedBy}
                    badge
                  >
                    {t("reversed")}
                  </TransactionLink>
                )}
                {reversalOf !== undefined && (
                  <TransactionLink
                    householdId={householdId}
                    accountId={accountId}
                    transactionId={reversalOf}
                  >
                    {originalRow === undefined
                      ? t("reversalOfUnknown")
                      : t("reversalOf", { row: rowLabel(originalRow) })}
                  </TransactionLink>
                )}
              </div>
            );
          },
        }),
        column.accessor("amount", {
          header: () => <span className="block text-right">{t("columns.amount")}</span>,
          cell: ({ row: { original } }) => {
            const month = monthOf(original.booking_date);
            const closed = month < openMonth;
            return (
              <span className="flex items-center justify-end gap-1.5 tabular-nums">
                {closed && (
                  <span title={t("closed", { month: formatMonth(month) })}>
                    <LockIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                    <span className="sr-only">{t("closed", { month: formatMonth(month) })}</span>
                  </span>
                )}
                {formatMoney(original.amount)}
              </span>
            );
          },
        }),
        column.accessor("category_id", {
          header: () => t("columns.category"),
          cell: ({ row: { original } }) => {
            const category = kinds.get(original.category_id);
            // The Opening balance, reversals and reversed rows can't change Category.
            const fixed =
              isReversalPair(original) ||
              category === undefined ||
              (category.kind === "INTERNAL" && !isUncategorised(category));
            if (fixed || categories === undefined) {
              return <span>{original.category_name}</span>;
            }
            // A closed month's Transactions never go back to Uncategorised.
            const closed = monthOf(original.booking_date) < openMonth;
            return (
              <div className="min-w-56">
                <CategoryPicker
                  id={`category-${original.transaction_id}`}
                  label={{ text: t("categoryFor", { row: rowLabel(original) }) }}
                  categories={categories}
                  includeUncategorised={!closed || isUncategorised(category)}
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
        column.display({
          id: "actions",
          header: () => <span className="sr-only">{t("columns.actions")}</span>,
          cell: ({ row: { original } }) => {
            const reversible =
              monthOf(original.booking_date) === openMonth &&
              !isReversalPair(original) &&
              !isOpeningBalance(original, kinds.get(original.category_id));
            if (!reversible) {
              return null;
            }
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("actionsFor", { row: rowLabel(original) })}
                    />
                  }
                >
                  <EllipsisIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setReversing(original);
                    }}
                  >
                    {t("reverse.menu")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        }),
      ]),
    [accountId, categories, changeCategory, householdId, kinds, openMonth, t],
  );

  const table = useTable({
    features,
    columns,
    data: transactions,
    getRowId: (transaction) => transaction.transaction_id,
  });
  const rows = table.getRowModel().rows;

  // All months: only the rows near the viewport are in the page.
  const { bodyRef, indexes, before, after, scrollToIndex } = useWindowRows({
    count: rows.length,
    estimate: rowHeight,
    virtual,
    onNearEnd,
  });
  const shown = indexes.map((index) => rows[index]).filter((row) => row !== undefined);

  // The highlighted row is brought into view and focused once, when it is
  // first rendered (a virtual list may need to scroll to it first).
  const toFocus = useRef(highlighted);
  useEffect(() => {
    toFocus.current = highlighted;
  }, [highlighted]);
  useEffect(() => {
    const target = toFocus.current;
    if (target === undefined) {
      return;
    }
    const element = document.getElementById(rowId(target));
    if (element !== null) {
      toFocus.current = undefined;
      element.scrollIntoView({ block: "center" });
      element.focus({ preventScroll: true });
      return;
    }
    const index = rows.findIndex(({ id }) => id === target);
    if (index !== -1) {
      scrollToIndex(index);
    }
  });

  return (
    <>
      <ReverseDialog
        householdId={householdId}
        accountId={accountId}
        transaction={reversing}
        onClose={() => {
          setReversing(undefined);
        }}
      />
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
              <td colSpan={columnCount} style={{ height: before }} />
            </tr>
          )}
          {shown.map((row) => (
            <TableRow
              key={row.id}
              id={rowId(row.id)}
              style={{ height: rowHeight }}
              {...(row.id === highlighted
                ? { tabIndex: -1, "aria-current": "true" as const, "data-highlighted": "" }
                : {})}
              className={cn(
                isReversalPair(row.original) && "text-muted-foreground",
                "data-highlighted:bg-primary/10 data-highlighted:outline-none",
              )}
            >
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className="first:pl-4 last:pr-4">
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {after > 0 && (
            <tr aria-hidden="true">
              <td colSpan={columnCount} style={{ height: after }} />
            </tr>
          )}
        </TableBody>
      </Table>
    </>
  );
}

/**
 * Links to another Transaction of the list, highlighting it there: a reversed
 * original to its reversal ("Reversed", as a badge), a reversal to its original.
 */
function TransactionLink({
  householdId,
  accountId,
  transactionId,
  badge = false,
  children,
}: {
  householdId: string;
  accountId: string;
  transactionId: string;
  badge?: boolean;
  children: string;
}) {
  return (
    <Link
      to="/households/$householdId/accounts/$accountId/transactions"
      params={{ householdId, accountId }}
      search={(previous) => ({ ...previous, transaction_id: transactionId })}
      className={cn(
        "text-xs font-medium underline-offset-4 hover:underline",
        badge ? "rounded-full border px-2 py-0.5" : "underline",
      )}
    >
      {children}
    </Link>
  );
}
