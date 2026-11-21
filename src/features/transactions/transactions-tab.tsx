import { useNavigate } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useErrorText } from "../../components/error-text";
import { MonthField, type MonthChoice } from "../../components/month-field";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { accountMonths, defaultBookingMonth } from "../../lib/account-months";
import { flattenCategories, isUncategorised, type CategoryNode } from "../../lib/categories";
import { formatMonth, type Month } from "../../lib/month";
import {
  useAllTransactions,
  useMonthTransactions,
  type AccountTransaction,
} from "./transactions-query";
import { TransactionsTable } from "./transactions-table";

interface TransactionsTabProps {
  householdId: string;
  accountId: string;
  bookingMonth: MonthChoice | undefined;
  uncategorised: boolean;
}

/**
 * The Transactions tab (spec, "Transactions"): the month field, the
 * "Uncategorised only" chip, and the list.
 */
export function TransactionsTab({
  householdId,
  accountId,
  bookingMonth,
  uncategorised,
}: TransactionsTabProps) {
  const { t } = useTranslation("transactions");
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
  const month = bookingMonth ?? defaultBookingMonth();
  const months = useMemo(() => accountMonths(account), [account]);

  const show = (search: { booking_month: MonthChoice; uncategorised?: true }) =>
    navigate({
      to: "/households/$householdId/accounts/$accountId/transactions",
      params: { householdId, accountId },
      search,
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
          <UncategorisedChip disabled />
        ) : (
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
        )}
      </div>
      {month === "all" ? (
        <AllMonths
          householdId={householdId}
          accountId={accountId}
          categories={categories.data?.items}
        />
      ) : (
        <OneMonth
          // A new month or filter starts the list over, so rows kept visible
          // under the filter (see there) don't carry across.
          key={`${month}-${String(uncategorised)}`}
          householdId={householdId}
          accountId={accountId}
          month={month}
          uncategorised={uncategorised}
          categories={categories.data?.items}
          onShowAll={() => void show({ booking_month: "all" })}
          onShowEverything={() => void show({ booking_month: month })}
        />
      )}
    </section>
  );
}

function uncategorisedId(categories: CategoryNode[] | undefined): string | undefined {
  return flattenCategories(categories ?? []).find(isUncategorised)?.id;
}

function UncategorisedChip({
  disabled = false,
  pressed = false,
  count,
  onToggle,
}: {
  disabled?: boolean;
  pressed?: boolean;
  count?: number;
  onToggle?: () => void;
}) {
  const { t } = useTranslation("transactions");
  const hintId = useId();
  return (
    <>
      <Button
        variant={pressed ? "secondary" : "outline"}
        size="sm"
        className="rounded-full"
        aria-pressed={pressed}
        disabled={disabled}
        aria-describedby={disabled ? hintId : undefined}
        onClick={onToggle}
      >
        {pressed && <CheckIcon aria-hidden="true" />}
        {count === undefined ? t("uncategorisedOnly") : t("uncategorisedCount", { count })}
      </Button>
      {disabled && (
        <span id={hintId} className="text-sm text-muted-foreground">
          {t("chooseMonthFirst")}
        </span>
      )}
    </>
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
  const { data } = useMonthTransactions(householdId, accountId, month);
  const uncategorised = uncategorisedId(categories);
  const count =
    data === undefined || uncategorised === undefined
      ? undefined
      : data.filter(({ category_id }) => category_id === uncategorised).length;
  return (
    <UncategorisedChip
      pressed={pressed}
      {...(count === undefined ? {} : { count })}
      onToggle={onToggle}
    />
  );
}

function OneMonth({
  householdId,
  accountId,
  month,
  uncategorised,
  categories,
  onShowAll,
  onShowEverything,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  uncategorised: boolean;
  categories: CategoryNode[] | undefined;
  onShowAll: () => void;
  onShowEverything: () => void;
}) {
  const { t } = useTranslation("transactions");
  const query = useMonthTransactions(householdId, accountId, month);
  const uncategorisedCategory = uncategorisedId(categories);
  // Under the filter, a row given a Category stays until the filter changes or
  // the page reloads, so it doesn't vanish under the User's pointer.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  const matching = (query.data ?? []).filter(
    ({ category_id }) => category_id === uncategorisedCategory,
  );
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
        ({ transaction_id, category_id }) =>
          kept.has(transaction_id) || category_id === uncategorisedCategory,
      )
    : query.data;

  if (rows.length === 0) {
    return uncategorised ? (
      <Empty
        message={t("empty.allCategorised", { month: formatMonth(month) })}
        action={t("empty.showAllTransactions")}
        onAction={onShowEverything}
      />
    ) : (
      <Empty
        message={t("empty.month", { month: formatMonth(month) })}
        action={t("empty.showAllMonths")}
        onAction={onShowAll}
      />
    );
  }
  return (
    <Card className="py-0">
      <CardContent className="px-0">
        <TransactionsTable
          householdId={householdId}
          accountId={accountId}
          transactions={rows}
          categories={categories}
        />
      </CardContent>
    </Card>
  );
}

function AllMonths({
  householdId,
  accountId,
  categories,
}: {
  householdId: string;
  accountId: string;
  categories: CategoryNode[] | undefined;
}) {
  const { t } = useTranslation("transactions");
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
    return (
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
}: {
  message: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <Card>
      <CardContent className="grid justify-items-start gap-3">
        <p>{message}</p>
        <Button variant="outline" onClick={onAction}>
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}
