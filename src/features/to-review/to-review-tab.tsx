import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { CategoryPicker } from "../../components/category-picker";
import { errorText, useErrorText } from "../../components/error-text";
import { MonthField, type MonthChoice } from "../../components/month-field";
import { rowLabel } from "../../components/row-label";
import { useErrorToast, useInfoToast } from "../../components/toaster";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toReviewMonths } from "../../lib/account-months";
import { flattenCategories, isUncategorised, type CategoryNode } from "../../lib/categories";
import { formatMonth, monthOf, type Month } from "../../lib/month";
import { ReviewTable } from "./review-table";
import {
  useAllRows,
  useDecide,
  usePendingPages,
  type Decision,
  type ImportedTransaction,
  type Outcome,
} from "./to-review-query";

interface ToReviewTabProps {
  householdId: string;
  accountId: string;
  bookingMonth: MonthChoice | undefined;
  suspectedOnly: boolean;
}

/**
 * The To review tab (spec, "To review"): the month field, Suspected duplicates
 * above Pending rows, each row's Accept, Keep and Discard, and bulk actions on
 * the selected rows.
 */
export function ToReviewTab({
  householdId,
  accountId,
  bookingMonth,
  suspectedOnly,
}: ToReviewTabProps) {
  const { t } = useTranslation("toReview");
  const { api } = useApi();
  const navigate = useNavigate();
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  // The route's loader has fetched them already.
  const { data: accountMonths } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/months",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  // No month means all months: rows To review may wait in months not open yet.
  const month = bookingMonth ?? "all";
  const months = useMemo(
    () => toReviewMonths(accountMonths.items, month === "all" ? undefined : month),
    [accountMonths, month],
  );
  const params = { householdId, accountId };

  if (account.awaiting_first_statement_import) {
    return (
      <Card>
        <CardContent className="grid justify-items-start gap-3">
          <p>{t("awaiting")}</p>
          <Link
            to="/households/$householdId/accounts/$accountId/statement-imports/new"
            params={params}
            className={buttonVariants()}
          >
            {t("importFirst")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const show = (search: { booking_month?: MonthChoice; state?: "SUSPECTED_DUPLICATE" }) =>
    navigate({ to: "/households/$householdId/accounts/$accountId/to-review", params, search });

  return (
    <section aria-label={t("title")} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <MonthField
          value={month}
          months={months}
          onValueChange={(choice) =>
            void show({
              booking_month: choice,
              ...(suspectedOnly ? { state: "SUSPECTED_DUPLICATE" } : {}),
            })
          }
        />
        {suspectedOnly && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {t("suspectedOnly")}
            <Button variant="outline" size="sm" onClick={() => void show({ booking_month: month })}>
              {t("showEverything")}
            </Button>
          </p>
        )}
      </div>
      <ReviewLists
        // A new month or filter starts the lists and the selection over.
        key={`${month}-${String(suspectedOnly)}`}
        householdId={householdId}
        accountId={accountId}
        openMonth={account.open_month as Month}
        month={month === "all" ? undefined : month}
        suspectedOnly={suspectedOnly}
        onShowAll={() => void show({ booking_month: "all" })}
      />
    </section>
  );
}

function uncategorisedId(categories: CategoryNode[] | undefined): string | undefined {
  return flattenCategories(categories ?? []).find(isUncategorised)?.id;
}

/** Rows in API order: Booking date, then as they came. */
function byBookingDate(rows: ImportedTransaction[]): ImportedTransaction[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => a.row.booking_date.localeCompare(b.row.booking_date) || a.index - b.index)
    .map(({ row }) => row);
}

function ReviewLists({
  householdId,
  accountId,
  openMonth,
  month,
  suspectedOnly,
  onShowAll,
}: {
  householdId: string;
  accountId: string;
  openMonth: Month;
  month: Month | undefined;
  suspectedOnly: boolean;
  onShowAll: () => void;
}) {
  const { t } = useTranslation("toReview");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const categories = api.useQuery("get", "/households/{household_id}/categories", {
    params: { path: { household_id: householdId } },
  }).data?.items;
  const suspectedQuery = useAllRows(householdId, accountId, "SUSPECTED_DUPLICATE", month, true);
  const pendingMonth = useAllRows(
    householdId,
    accountId,
    "PENDING",
    month,
    month !== undefined && !suspectedOnly,
  );
  const pendingPages = usePendingPages(
    householdId,
    accountId,
    month === undefined && !suspectedOnly,
  );
  const decide = useDecide(householdId, accountId);
  const errorToast = useErrorToast();
  const infoToast = useInfoToast();
  const navigate = useNavigate();
  const suspectedHelpId = useId();

  // What the User did, shown at once, until the refetched lists say the same.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [kept, setKept] = useState<ReadonlyMap<string, ImportedTransaction>>(new Map());
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [chosen, setChosen] = useState<ReadonlyMap<string, string>>(new Map());
  const [bulkCategory, setBulkCategory] = useState<string>();
  const [toDiscard, setToDiscard] = useState<ImportedTransaction[]>();

  const uncategorised = uncategorisedId(categories);
  // A Pending row booked after the open month waits for its month to open. A
  // Suspected duplicate there can still be kept or Discarded.
  const lockOf = (row: ImportedTransaction) => {
    const rowMonth = monthOf(row.booking_date);
    return row.state === "PENDING" && rowMonth > openMonth
      ? t("notOpenYet", { month: formatMonth(rowMonth) })
      : undefined;
  };
  const categoryOf = (row: ImportedTransaction) =>
    chosen.get(row.imported_transaction_id) ?? uncategorised;

  const suspectedRows = (suspectedQuery.data ?? []).filter(
    ({ imported_transaction_id: id }) => !removed.has(id) && !kept.has(id),
  );
  const loadedPending =
    month === undefined
      ? (pendingPages.data?.pages.flatMap(({ items }) => items) ?? [])
      : (pendingMonth.data ?? []);
  const pendingIds = new Set(loadedPending.map(({ imported_transaction_id: id }) => id));
  const pendingRows = byBookingDate([
    ...loadedPending.filter(({ imported_transaction_id: id }) => !removed.has(id)),
    ...[...kept.values()].filter(({ imported_transaction_id: id }) => !pendingIds.has(id)),
  ]);
  const visible = new Map(
    [...suspectedRows, ...(suspectedOnly ? [] : pendingRows)].map((row) => [
      row.imported_transaction_id,
      row,
    ]),
  );
  const selectedRows = [...selected].flatMap((id) => {
    const row = visible.get(id);
    return row === undefined ? [] : [row];
  });

  const run = async (decision: Decision, rows: ImportedTransaction[], category?: string) => {
    const ids = rows.map(({ imported_transaction_id: id }) => id);
    const without = (set: ReadonlySet<string>) =>
      new Set([...set].filter((id) => !ids.includes(id)));
    setBusy((current) => new Set([...current, ...ids]));
    if (decision === "keep") {
      setKept(
        (current) =>
          new Map([
            ...current,
            ...rows.map(
              (row) => [row.imported_transaction_id, { ...row, state: "PENDING" }] as const,
            ),
          ]),
      );
    } else {
      setRemoved((current) => new Set([...current, ...ids]));
    }
    const outcomes = await decide(decision, rows, (row) =>
      decision === "accept" ? (category ?? categoryOf(row)) : undefined,
    );
    // The lists are refetched: they say what happened, and failed rows come back.
    setBusy(without);
    setRemoved(without);
    setKept((current) => new Map([...current].filter(([id]) => !ids.includes(id))));
    const failed = outcomes.filter(({ kind }) => kind === "failed");
    const failedIds = new Set(failed.map(({ row }) => row.imported_transaction_id));
    setSelected(
      (current) => new Set([...current].filter((id) => !ids.includes(id) || failedIds.has(id))),
    );
    report(decision, outcomes);
  };

  const viewTransactions = {
    label: t("viewInTransactions"),
    onClick: () =>
      void navigate({
        to: "/households/$householdId/accounts/$accountId/transactions",
        params: { householdId, accountId },
      }),
  };

  const report = (decision: Decision, outcomes: Outcome[]) => {
    const done = outcomes.filter(({ kind }) => kind === "done").length;
    const failed = outcomes.filter((outcome) => outcome.kind === "failed");
    const conflicts = outcomes.filter((outcome) => outcome.kind === "conflict");
    if (outcomes.length === 1) {
      const [outcome] = outcomes;
      if (outcome === undefined) {
        return;
      }
      const label = rowLabel(outcome.row);
      if (outcome.kind === "done" && decision === "accept") {
        infoToast(t("outcome.accept", { count: 1 }), viewTransactions);
      } else if (outcome.kind === "conflict") {
        // Someone else decided it first: the server says how, and the row stays gone.
        infoToast(errorText(outcome.error, tCommon).title, undefined, label);
      } else if (outcome.kind === "failed") {
        const { title, detail } = errorText(outcome.error, tCommon);
        errorToast(
          t(`failed.${decision}`, { row: label }),
          detail === undefined ? title : `${title}: ${detail}`,
        );
      }
      return;
    }
    const summary = [
      ...(done > 0 ? [t(`outcome.${decision}`, { count: done })] : []),
      ...(failed.length > 0 ? [t("outcome.failed", { count: failed.length })] : []),
      ...(conflicts.length > 0 ? [t("outcome.conflict", { count: conflicts.length })] : []),
    ].join(", ");
    const [firstFailure] = failed;
    if (firstFailure !== undefined) {
      const { title, detail } = errorText(firstFailure.error, tCommon);
      errorToast(
        summary,
        `${rowLabel(firstFailure.row)}: ${detail === undefined ? title : `${title}: ${detail}`}`,
      );
    } else {
      infoToast(summary, decision === "accept" && done > 0 ? viewTransactions : undefined);
    }
  };

  const pendingLoading = suspectedOnly
    ? false
    : month === undefined
      ? pendingPages.isPending
      : pendingMonth.isPending;
  const loadError =
    suspectedQuery.error ??
    (suspectedOnly ? null : month === undefined ? pendingPages.error : pendingMonth.error);
  if (suspectedQuery.isPending || pendingLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }
  if (loadError !== null) {
    return (
      <LoadFailed
        error={loadError}
        onRetry={() => {
          void suspectedQuery.refetch();
          void (month === undefined ? pendingPages.refetch() : pendingMonth.refetch());
        }}
      />
    );
  }

  const nothing = suspectedRows.length === 0 && (suspectedOnly || pendingRows.length === 0);
  const allSuspected =
    selectedRows.length > 0 && selectedRows.every(({ state }) => state === "SUSPECTED_DUPLICATE");
  const allPending =
    selectedRows.length > 0 && selectedRows.every(({ state }) => state === "PENDING");

  return (
    <>
      <BulkBar
        count={selectedRows.length}
        categories={categories}
        category={bulkCategory ?? uncategorised}
        onCategoryChange={setBulkCategory}
        canAccept={allPending}
        canKeep={allSuspected}
        onAccept={() => void run("accept", selectedRows, bulkCategory ?? uncategorised)}
        onKeep={() => void run("keep", selectedRows)}
        onDiscard={() => {
          setToDiscard(selectedRows);
        }}
        onClear={() => {
          setSelected(new Set());
        }}
      />
      {nothing && (
        <Empty
          householdId={householdId}
          accountId={accountId}
          month={month}
          suspectedOnly={suspectedOnly}
          onShowAll={onShowAll}
        />
      )}
      {suspectedRows.length > 0 && (
        <section aria-labelledby={`${suspectedHelpId}-title`} className="grid gap-2">
          <h2 id={`${suspectedHelpId}-title`} className="text-lg font-semibold">
            {t("sections.suspected")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("suspectedHelp")}</p>
          <Card className="py-0">
            <CardContent className="px-0">
              <ReviewTable
                section="suspected"
                rows={suspectedRows}
                selected={selected}
                onSelectionChange={setSelected}
                busy={busy}
                onKeep={(row) => void run("keep", [row])}
                onDiscard={(row) => {
                  setToDiscard([row]);
                }}
              />
            </CardContent>
          </Card>
        </section>
      )}
      {!suspectedOnly && pendingRows.length > 0 && (
        <section aria-labelledby={`${suspectedHelpId}-pending`} className="grid gap-2">
          <h2 id={`${suspectedHelpId}-pending`} className="text-lg font-semibold">
            {t("sections.pending")}
          </h2>
          {month === undefined && (
            <p role="status" className="text-sm text-muted-foreground">
              {pendingPages.hasNextPage
                ? t("showingSoFar", { count: pendingRows.length })
                : t("showingAll", { count: pendingRows.length })}
            </p>
          )}
          <Card className="py-0">
            <CardContent className="px-0">
              <ReviewTable
                section="pending"
                rows={pendingRows}
                selected={selected}
                onSelectionChange={setSelected}
                busy={busy}
                categories={categories}
                categoryOf={categoryOf}
                lockOf={lockOf}
                onCategoryChange={(row, categoryId) => {
                  setChosen(
                    (current) => new Map([...current, [row.imported_transaction_id, categoryId]]),
                  );
                }}
                onAccept={(row) => void run("accept", [row])}
                onDiscard={(row) => {
                  setToDiscard([row]);
                }}
                virtual={month === undefined}
                onNearEnd={() => {
                  if (pendingPages.hasNextPage && !pendingPages.isFetchingNextPage) {
                    void pendingPages.fetchNextPage();
                  }
                }}
              />
            </CardContent>
          </Card>
        </section>
      )}
      <DiscardDialog
        rows={toDiscard}
        onCancel={() => {
          setToDiscard(undefined);
        }}
        onConfirm={(rows) => {
          setToDiscard(undefined);
          void run("discard", rows);
        }}
      />
    </>
  );
}

function BulkBar({
  count,
  categories,
  category,
  onCategoryChange,
  canAccept,
  canKeep,
  onAccept,
  onKeep,
  onDiscard,
  onClear,
}: {
  count: number;
  categories: CategoryNode[] | undefined;
  category: string | undefined;
  onCategoryChange: (categoryId: string) => void;
  canAccept: boolean;
  canKeep: boolean;
  onAccept: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation("toReview");
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={
        count === 0
          ? "contents"
          : "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2"
      }
    >
      <span id={labelId} className="sr-only">
        {t("bulk.label")}
      </span>
      {/* Always in the page, so each change of the count is announced. */}
      <p role="status" className={count === 0 ? "sr-only" : "px-1 text-sm font-medium"}>
        {count > 0 ? t("selected", { count }) : ""}
      </p>
      {count > 0 && (
        <>
          {canAccept && categories !== undefined && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{t("bulk.acceptAs")}</span>
              <div className="min-w-56">
                <CategoryPicker
                  id="bulk-category"
                  label={{ text: t("bulk.categoryForSelected") }}
                  categories={categories}
                  value={category ?? null}
                  onValueChange={(categoryId) => {
                    if (categoryId !== null) {
                      onCategoryChange(categoryId);
                    }
                  }}
                />
              </div>
              <Button size="sm" onClick={onAccept}>
                {t("bulk.accept")}
              </Button>
            </div>
          )}
          {canKeep && (
            <Button size="sm" variant="outline" onClick={onKeep}>
              {t("bulk.keep")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDiscard}>
            {t("bulk.discard")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            {t("bulk.clear")}
          </Button>
        </>
      )}
    </div>
  );
}

/** One dialog for Discarding one row or many, since Discard is final. */
function DiscardDialog({
  rows,
  onCancel,
  onConfirm,
}: {
  rows: ImportedTransaction[] | undefined;
  onCancel: () => void;
  onConfirm: (rows: ImportedTransaction[]) => void;
}) {
  const { t } = useTranslation("toReview");
  const count = rows?.length ?? 0;
  return (
    <Dialog
      open={rows !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("discardDialog.title", { count })}</DialogTitle>
          <DialogDescription>{t("discardDialog.description")}</DialogDescription>
        </DialogHeader>
        {rows !== undefined && count <= 5 && (
          <ul className="grid gap-1 text-sm">
            {rows.map((row) => (
              <li key={row.imported_transaction_id}>{rowLabel(row)}</li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("discardDialog.cancel")}
          </DialogClose>
          <Button
            onClick={() => {
              if (rows !== undefined) {
                onConfirm(rows);
              }
            }}
          >
            {t("discardDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Empty({
  householdId,
  accountId,
  month,
  suspectedOnly,
  onShowAll,
}: {
  householdId: string;
  accountId: string;
  month: Month | undefined;
  suspectedOnly: boolean;
  onShowAll: () => void;
}) {
  const { t } = useTranslation("toReview");
  const params = { householdId, accountId };
  return (
    <Card>
      <CardContent className="grid justify-items-start gap-3">
        {suspectedOnly ? (
          // "Show everything" is beside the month field already.
          <p>{t("empty.noSuspected")}</p>
        ) : month === undefined ? (
          <>
            <p>{t("empty.none")}</p>
            <Link
              to="/households/$householdId/accounts/$accountId/transactions"
              params={params}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("empty.goToTransactions")}
            </Link>
          </>
        ) : (
          <>
            <p>{t("empty.month", { month: formatMonth(month) })}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onShowAll}>
                {t("empty.showAllMonths")}
              </Button>
              <Link
                to="/households/$householdId/accounts/$accountId/months/$bookingMonth"
                params={{ ...params, bookingMonth: month }}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("empty.goToMonth", { month: formatMonth(month) })}
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LoadFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { title, detail } = useErrorText(error);
  return (
    <Card>
      <CardContent className="grid justify-items-start gap-2">
        <div role="alert" className="grid gap-1">
          <p className="font-medium">{title}</p>
          {detail !== undefined && <p className="text-sm text-muted-foreground">{detail}</p>}
        </div>
        <Button variant="outline" onClick={onRetry}>
          {t("errors.tryAgain")}
        </Button>
      </CardContent>
    </Card>
  );
}
