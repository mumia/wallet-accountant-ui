import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { isCash } from "../../lib/account-query";
import { formatMonth, isMonth, type Month } from "../../lib/month";
import { ClosedMonth } from "./closed-month";
import { InTransitCount } from "./in-transit-count";
import { AwaitingFirstImport, MonthStateBadge } from "./months-tab";
import { useMonths } from "./months-query";
import { OpenMonth } from "./open-month";

/**
 * One month of an Account (spec, "Month screen"): ← / → between its months,
 * and the month as it stands: Open, Closed, Not open yet, or the Account
 * awaiting its first Statement import.
 */
export function MonthPage({
  householdId,
  accountId,
  bookingMonth,
}: {
  householdId: string;
  accountId: string;
  bookingMonth: string;
}) {
  const { t } = useTranslation("months");
  const { api } = useApi();
  const path = { params: { path: { household_id: householdId, account_id: accountId } } };
  // The routes' loaders have fetched these.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    path,
  );
  const { data: currencies } = api.useSuspenseQuery("get", "/currencies");
  const { data: months } = useMonths(householdId, accountId);
  const params = { householdId, accountId };
  const index = months.items.findIndex(({ booking_month }) => booking_month === bookingMonth);
  const status = months.items[index];
  // Newest first: the next month is the one before in the list.
  const later = months.items[index - 1]?.booking_month as Month | undefined;
  const earlier = months.items[index + 1]?.booking_month as Month | undefined;
  const label = isMonth(bookingMonth) ? formatMonth(bookingMonth) : bookingMonth;

  if (account.awaiting_first_statement_import) {
    return <AwaitingFirstImport householdId={householdId} accountId={accountId} />;
  }
  if (status === undefined || !isMonth(bookingMonth)) {
    return (
      <Card>
        <CardContent className="grid justify-items-start gap-3">
          <p>{t("notAMonth", { month: label })}</p>
          <Link
            to="/households/$householdId/accounts/$accountId/months"
            params={params}
            className={buttonVariants({ variant: "outline" })}
          >
            {t("allMonths")}
          </Link>
        </CardContent>
      </Card>
    );
  }
  const month = bookingMonth;
  const openMonth = account.open_month as Month;
  const decimalPlaces =
    currencies.items.find(({ code }) => code === account.currency)?.decimal_places ?? 2;

  const arrow = (to: Month | undefined, name: string, missing: string, icon: ReactNode) =>
    to === undefined ? (
      <Button variant="outline" size="icon" disabled aria-label={missing}>
        {icon}
      </Button>
    ) : (
      <Link
        to="/households/$householdId/accounts/$accountId/months/$bookingMonth"
        params={{ ...params, bookingMonth: to }}
        aria-label={t(name === "previous" ? "previous" : "next", { month: formatMonth(to) })}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        {icon}
      </Link>
    );

  return (
    <section aria-labelledby="month-title" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {arrow(earlier, "previous", t("noPrevious"), <ChevronLeftIcon aria-hidden="true" />)}
        <h2 id="month-title" className="text-xl font-semibold tracking-tight">
          {label}
        </h2>
        {arrow(later, "next", t("noNext"), <ChevronRightIcon aria-hidden="true" />)}
        <MonthStateBadge state={status.state} />
      </div>
      <InTransitCount count={status.transfer_legs_in_transit} />
      {status.state === "OPEN" && (
        <OpenMonth
          // A new month starts the form over.
          key={month}
          householdId={householdId}
          accountId={accountId}
          month={month}
          status={status}
          currency={account.currency}
          decimalPlaces={decimalPlaces}
          cash={isCash(account)}
        />
      )}
      {status.state === "CLOSED" && (
        <ClosedMonth
          householdId={householdId}
          accountId={accountId}
          month={month}
          status={status}
          openMonth={openMonth}
          cash={isCash(account)}
        />
      )}
      {status.state === "NOT_OPEN_YET" && (
        <Card>
          <CardContent className="grid justify-items-start gap-3">
            <p>{t("notOpenYet.body", { month: label, open: formatMonth(openMonth) })}</p>
            <Link
              to="/households/$householdId/accounts/$accountId/months/$bookingMonth"
              params={{ ...params, bookingMonth: openMonth }}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("notOpenYet.closeFirst", { open: formatMonth(openMonth) })}
            </Link>
            {status.pending > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("notOpenYet.pending", { count: status.pending, month: label })}
              </p>
            )}
            {/* Unlike Pending rows, a Suspected duplicate here can be decided now. */}
            {status.suspected_duplicates > 0 && (
              <Link
                to="/households/$householdId/accounts/$accountId/to-review"
                params={params}
                search={{ booking_month: bookingMonth, state: "SUSPECTED_DUPLICATE" }}
                className="text-sm font-medium underline underline-offset-4"
              >
                {t("notOpenYet.suspected", { count: status.suspected_duplicates })}
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
