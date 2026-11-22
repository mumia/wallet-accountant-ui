import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { formatMonth, type Month } from "../../lib/month";
import { useMonths } from "./months-query";

/** The month states the contract lists. It is an extensible enum: an unknown value is shown as sent. */
export const monthStates = ["OPEN", "CLOSED", "NOT_OPEN_YET"] as const;
type KnownState = (typeof monthStates)[number];
export const isKnownMonthState = (state: string): state is KnownState =>
  (monthStates as readonly string[]).includes(state);

/** A month's state as a badge: always text, the colour only a hint. */
export function MonthStateBadge({ state }: { state: string }) {
  const { t } = useTranslation("months");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        state === "OPEN" && "border-primary bg-primary/10 text-foreground",
        state !== "OPEN" && "text-muted-foreground",
      )}
    >
      {isKnownMonthState(state) ? t(`states.${state}`) : state}
    </span>
  );
}

/** Shown instead of months while the Account awaits its first Statement import. */
export function AwaitingFirstImport({
  householdId,
  accountId,
}: {
  householdId: string;
  accountId: string;
}) {
  const { t } = useTranslation("months");
  return (
    <Card>
      <CardContent className="grid justify-items-start gap-3">
        <p>{t("awaiting")}</p>
        <Link
          to="/households/$householdId/accounts/$accountId/statement-imports/new"
          params={{ householdId, accountId }}
          className={buttonVariants()}
        >
          {t("importFirst")}
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * The Months tab (spec, "Months tab"): every month of the Account, newest
 * first, with its state and counts, each linking to its screen.
 */
export function MonthsTab({ householdId, accountId }: { householdId: string; accountId: string }) {
  const { t } = useTranslation("months");
  const { api } = useApi();
  // The Account area's loader has fetched it.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  const { data } = useMonths(householdId, accountId);
  if (account.awaiting_first_statement_import) {
    return <AwaitingFirstImport householdId={householdId} accountId={accountId} />;
  }
  return (
    <section aria-label={t("title")}>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("columns.month")}</TableHead>
                <TableHead>{t("columns.state")}</TableHead>
                <TableHead className="text-right">{t("columns.pending")}</TableHead>
                <TableHead className="text-right">{t("columns.suspected")}</TableHead>
                <TableHead className="pr-4 text-right">{t("columns.uncategorised")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((month) => (
                <TableRow key={month.booking_month}>
                  <TableCell className="pl-4">
                    <Link
                      to="/households/$householdId/accounts/$accountId/months/$bookingMonth"
                      params={{ householdId, accountId, bookingMonth: month.booking_month }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {formatMonth(month.booking_month as Month)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <MonthStateBadge state={month.state} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{month.pending}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {month.suspected_duplicates}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">
                    {month.uncategorised}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
