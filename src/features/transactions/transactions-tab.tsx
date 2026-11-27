import { useNavigate } from "@tanstack/react-router";
import { CheckIcon, LockIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useErrorText } from "../../components/error-text";
import { MonthField, type MonthChoice } from "../../components/month-field";
import { useRecordTransaction } from "../../components/record-transaction";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { defaultBookingMonth, toReviewCountIn, transactionMonths } from "../../lib/account-months";
import { flattenCategories, isUncategorised, type CategoryNode } from "../../lib/categories";
import { formatMonth, type Month } from "../../lib/month";
import {
  useAllTransactions,
  useMonthTransactions,
  type AccountTransaction,
} from "./transactions-query";
import { isReversalPair, TransactionsTable } from "./transactions-table";

interface TransactionsTabProps {
  householdId: string;
  accountId: string;
  bookingMonth: MonthChoice | undefined;
  uncategorised: boolean;
  /** Only the Transfer legs In transit. Never with `uncategorised`: no leg is Uncategorised. */
  inTransit: boolean;
  /** A Transaction to highlight. */
  highlighted: string | undefined;
}

/**
 * The Transactions tab (spec, "Transactions"): the month field, the
 * "Uncategorised only" and "In transit only" chips, and the list.
 */
export function TransactionsTab({
  householdId,
  accountId,
  bookingMonth,
  uncategorised,
  inTransit,
  highlighted,
}: TransactionsTabProps) {
  const { t } = useTranslation("transactions");
  const hintId = useId();
  const { api } = useApi();
  const navigate = useNavigate();
  const path = { params: { path: { household_id: householdId, account_id: accountId } } };
  // The Account area's loader has fetched it already.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    path,
  );
  const categories = api.useQuery("get", "/households/{household_id}/categories", {
    params: { path: { household_id: householdId } },
  });
  // The route's loader has fetched them already.
  const { data: accountMonths } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/months",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  const month = bookingMonth ?? defaultBookingMonth(account);
  const months = useMemo(() => transactionMonths(accountMonths.items), [accountMonths]);
  const openMonth = account.open_month as Month;

  const show = (search: { booking_month: MonthChoice; uncategorised?: true; in_transit?: true }) =>
    navigate({
      to: "/households/$householdId/accounts/$accountId/transactions",
      params: { householdId, accountId },
      search,
    });
  const toReview = () =>
    navigate({
      to: "/households/$householdId/accounts/$accountId/to-review",
      params: { householdId, accountId },
      search: { booking_month: month },
    });

  return (
    <section aria-label={t("title")} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <MonthField
          value={month}
          months={months}
          onValueChange={(choice) => void show({ booking_month: choice })}
        />
        {month === "all" ? (
          <>
            {/* Both filters need a month. */}
            <FilterChip label={t("uncategorisedOnly")} disabled describedBy={hintId} />
            <FilterChip label={t("inTransitOnly")} disabled describedBy={hintId} />
            <span id={hintId} className="text-sm text-muted-foreground">
              {t("chooseMonthFirst")}
            </span>
          </>
        ) : (
          <>
            {/* The two filters are exclusive: pressing one releases the other. */}
            <MonthChip
              householdId={householdId}
              accountId={accountId}
              month={month}
              pressed={uncategorised}
              categories={categories.data?.items}
              onToggle={() =>
                void show(
                  uncategorised
                    ? { booking_month: month }
                    : { booking_month: month, uncategorised: true },
                )
              }
            />
            <FilterChip
              label={t("inTransitOnly")}
              countLabel={(count) => t("inTransitCount", { count })}
              count={
                accountMonths.items.find(({ booking_month }) => booking_month === month)
                  ?.transfer_legs_in_transit
              }
              pressed={inTransit}
              onToggle={() =>
                void show(
                  inTransit ? { booking_month: month } : { booking_month: month, in_transit: true },
                )
              }
            />
          </>
        )}
      </div>
      {month === "all" ? (
        <AllMonths
          householdId={householdId}
          accountId={accountId}
          categories={categories.data?.items}
          openMonth={openMonth}
          highlighted={highlighted}
        />
      ) : (
        <OneMonth
          // A new month or filter starts the list over, so rows kept visible
          // under the filter (see there) don't carry across.
          key={`${month}-${String(uncategorised)}-${String(inTransit)}`}
          householdId={householdId}
          accountId={accountId}
          month={month}
          uncategorised={uncategorised}
          inTransit={inTransit}
          categories={categories.data?.items}
          openMonth={openMonth}
          highlighted={highlighted}
          toReviewCount={toReviewCountIn(accountMonths.items, month)}
          onShowAll={() => void show({ booking_month: "all" })}
          onToReview={() => void toReview()}
          onShowEverything={() => void show({ booking_month: month })}
        />
      )}
    </section>
  );
}

/**
 * The month's Uncategorised Transactions, by the Uncategorised Category's ID:
 * reversals and reversed originals don't count, as the backend counts them.
 */
function uncategorisedRows(
  transactions: readonly AccountTransaction[],
  categories: CategoryNode[] | undefined,
): AccountTransaction[] | undefined {
  const uncategorised = flattenCategories(categories ?? []).find(isUncategorised)?.id;
  return uncategorised === undefined
    ? undefined
    : transactions.filter(
        (transaction) => transaction.category_id === uncategorised && !isReversalPair(transaction),
      );
}

/** A filter chip, a toggle button, with its count once known. */
function FilterChip({
  label,
  countLabel,
  count,
  disabled = false,
  describedBy,
  pressed = false,
  onToggle,
}: {
  label: string;
  countLabel?: (count: number) => string;
  count?: number | undefined;
  disabled?: boolean;
  describedBy?: string;
  pressed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <Button
      variant={pressed ? "secondary" : "outline"}
      size="sm"
      className="rounded-full"
      aria-pressed={pressed}
      disabled={disabled}
      aria-describedby={describedBy}
      onClick={onToggle}
    >
      {pressed && <CheckIcon aria-hidden="true" />}
      {count === undefined || countLabel === undefined ? label : countLabel(count)}
    </Button>
  );
}

function MonthChip({
  householdId,
  accountId,
  month,
  pressed,
  categories,
  onToggle,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  pressed: boolean;
  categories: CategoryNode[] | undefined;
  onToggle: () => void;
}) {
  const { t } = useTranslation("transactions");
  const { data } = useMonthTransactions(householdId, accountId, month);
  const count = data === undefined ? undefined : uncategorisedRows(data, categories)?.length;
  return (
    <FilterChip
      label={t("uncategorisedOnly")}
      countLabel={(n) => t("uncategorisedCount", { count: n })}
      count={count}
      pressed={pressed}
      onToggle={onToggle}
    />
  );
}

function OneMonth({
  householdId,
  accountId,
  month,
  uncategorised,
  inTransit,
  categories,
  openMonth,
  highlighted,
  toReviewCount,
  onShowAll,
  onToReview,
  onShowEverything,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  uncategorised: boolean;
  inTransit: boolean;
  categories: CategoryNode[] | undefined;
  openMonth: Month;
  highlighted: string | undefined;
  /** The month's rows To review. */
  toReviewCount: number;
  onShowAll: () => void;
  onToReview: () => void;
  onShowEverything: () => void;
}) {
  const { t } = useTranslation("transactions");
  const record = useRecordTransaction();
  // In transit is the backend's filter; Uncategorised is worked out here.
  const query = useMonthTransactions(householdId, accountId, month, inTransit);
  // Under the filter, a row given a Category (or reversed) stays until the
  // filter changes or the page reloads, so it doesn't vanish under the User's
  // pointer.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const matching = uncategorisedRows(query.data ?? [], categories) ?? [];
  const matchingIds = new Set(matching.map(({ transaction_id }) => transaction_id));
  const unseen = matching.filter(({ transaction_id }) => !kept.has(transaction_id));
  if (uncategorised && unseen.length > 0) {
    setKept(new Set([...kept, ...unseen.map(({ transaction_id }) => transaction_id)]));
  }

  if (query.isPending) {
    return <Loading />;
  }
  if (query.isError) {
    return <LoadFailed error={query.error} onRetry={() => void query.refetch()} />;
  }
  const rows: AccountTransaction[] = uncategorised
    ? query.data.filter(
        ({ transaction_id }) => kept.has(transaction_id) || matchingIds.has(transaction_id),
      )
    : query.data;
  const closed = month < openMonth;

  if (rows.length === 0) {
    if (inTransit) {
      return (
        <Empty
          message={t("empty.noneInTransit", { month: formatMonth(month) })}
          action={t("empty.showAllTransactions")}
          onAction={onShowEverything}
        />
      );
    }
    return uncategorised ? (
      <Empty
        message={t("empty.allCategorised", { month: formatMonth(month) })}
        action={t("empty.showAllTransactions")}
        onAction={onShowEverything}
      />
    ) : record !== undefined ? (
      // A cash Account's rows are recorded by hand.
      <Empty
        message={t("empty.monthCash", { month: formatMonth(month) })}
        action={t("empty.recordOne")}
        onAction={() => {
          record();
        }}
        secondary={t("empty.showAllMonths")}
        onSecondary={onShowAll}
      />
    ) : (
      <Empty
        message={t("empty.month", { month: formatMonth(month) })}
        action={t("empty.showAllMonths")}
        onAction={onShowAll}
        {...(toReviewCount > 0
          ? { secondary: t("empty.goToReview"), onSecondary: onToReview }
          : {})}
      />
    );
  }
  return (
    <>
      {closed && (
        <p className="text-sm text-muted-foreground">
          <LockIcon aria-hidden="true" className="mr-1 inline size-3.5 align-[-2px]" />
          {t("closedNote", { month: formatMonth(month) })}
        </p>
      )}
      <Card className="py-0">
        <CardContent className="px-0">
          <TransactionsTable
            householdId={householdId}
            accountId={accountId}
            transactions={rows}
            categories={categories}
            openMonth={openMonth}
            highlighted={highlighted}
          />
        </CardContent>
      </Card>
    </>
  );
}

function AllMonths({
  householdId,
  accountId,
  categories,
  openMonth,
  highlighted,
}: {
  householdId: string;
  accountId: string;
  categories: CategoryNode[] | undefined;
  openMonth: Month;
  highlighted: string | undefined;
}) {
  const { t } = useTranslation("transactions");
  const record = useRecordTransaction();
  const query = useAllTransactions(householdId, accountId);
  const rows = useMemo(() => query.data?.pages.flatMap(({ items }) => items) ?? [], [query.data]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadMore = useMemo(
    () => () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  if (query.isPending) {
    return <Loading />;
  }
  if (query.isError) {
    return <LoadFailed error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (rows.length === 0) {
    return record !== undefined ? (
      <Empty
        message={t("empty.noneCash")}
        action={t("empty.recordOne")}
        onAction={() => {
          record();
        }}
      />
    ) : (
      <Card>
        <CardContent>
          <p>{t("empty.none")}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <p role="status" className="text-sm text-muted-foreground">
        {hasNextPage
          ? t("showingSoFar", { count: rows.length })
          : t("showingAll", { count: rows.length })}
      </p>
      <Card className="py-0">
        <CardContent className="px-0">
          <TransactionsTable
            householdId={householdId}
            accountId={accountId}
            transactions={rows}
            categories={categories}
            openMonth={openMonth}
            highlighted={highlighted}
            virtual
            onNearEnd={loadMore}
          />
        </CardContent>
      </Card>
    </>
  );
}

function Loading() {
  const { t } = useTranslation("transactions");
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {t("loading")}
    </p>
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

function Empty({
  message,
  action,
  onAction,
  secondary,
  onSecondary,
}: {
  message: string;
  action: string;
  onAction: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  return (
    <Card>
      <CardContent className="grid justify-items-start gap-3">
        <p>{message}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onAction}>
            {action}
          </Button>
          {secondary !== undefined && (
            <Button variant="outline" onClick={onSecondary}>
              {secondary}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
