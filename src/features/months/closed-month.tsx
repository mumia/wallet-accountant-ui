import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useErrorText } from "../../components/error-text";
import { useInfoToast } from "../../components/toaster";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
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
import { addMonths, formatMonth, type Month } from "../../lib/month";
import { formatMoney } from "../../lib/money";
import { useReopenMonth, type AccountMonth } from "./months-query";

const longDate = (dateTime: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(dateTime),
  );

function ReopenFailed({ error }: { error: unknown }) {
  const { title, detail } = useErrorText(error);
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      {detail !== undefined && <AlertDescription>{detail}</AlertDescription>}
    </Alert>
  );
}

/**
 * A closed month (spec, "Month screen": Closed): its Statement balance and when
 * it closed, and Reopen on the latest closed month, disabled with the reason
 * while the open month has Accepted Transactions.
 */
export function ClosedMonth({
  householdId,
  accountId,
  month,
  status,
  openMonth,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  status: AccountMonth;
  openMonth: Month;
}) {
  const { t } = useTranslation("months");
  const toast = useInfoToast();
  const reopen = useReopenMonth(householdId, accountId);
  const [confirming, setConfirming] = useState(false);
  const blockedId = useId();
  const latest = addMonths(openMonth, -1) === month;
  const names = { month: formatMonth(month), next: formatMonth(addMonths(month, 1)) };

  return (
    <Card>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          {status.statement_balance !== undefined && (
            <>
              <dt className="text-muted-foreground">{t("closed.statementBalance")}</dt>
              <dd className="font-medium tabular-nums">{formatMoney(status.statement_balance)}</dd>
            </>
          )}
          {status.computed_balance !== undefined && (
            <>
              <dt className="text-muted-foreground">{t("closed.computedBalance")}</dt>
              <dd className="tabular-nums">{formatMoney(status.computed_balance)}</dd>
            </>
          )}
        </dl>
        {status.closed_at !== undefined && (
          <p className="text-sm text-muted-foreground">
            {t("closed.closedOn", { date: longDate(status.closed_at) })}
          </p>
        )}
        {latest && (
          <div className="grid justify-items-start gap-2">
            <Button
              variant="outline"
              disabled={status.reopen_blocked}
              aria-describedby={status.reopen_blocked ? blockedId : undefined}
              onClick={() => {
                reopen.reset();
                setConfirming(true);
              }}
            >
              {t("closed.reopen", { month: names.month })}
            </Button>
            {status.reopen_blocked && (
              <p id={blockedId} className="text-sm">
                {t("closed.reopenBlocked", { open: formatMonth(openMonth) })}{" "}
                <Link
                  to="/households/$householdId/accounts/$accountId/transactions"
                  params={{ householdId, accountId }}
                  search={{ booking_month: openMonth }}
                  className="font-medium underline underline-offset-4"
                >
                  {t("closed.seeOpenTransactions", { open: formatMonth(openMonth) })}
                </Link>
              </p>
            )}
          </div>
        )}
      </CardContent>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("closed.dialogTitle", names)}</DialogTitle>
            <DialogDescription>{t("closed.dialogBody", names)}</DialogDescription>
          </DialogHeader>
          {reopen.isError && <ReopenFailed error={reopen.error} />}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("closed.cancel")}</DialogClose>
            <Button
              disabled={reopen.isPending}
              onClick={() => {
                // Awaited, not a mutate callback: once reopened, this closed
                // view unmounts before a callback would run.
                void reopen
                  .mutateAsync(month)
                  .then(() => {
                    setConfirming(false);
                    toast(t("closed.reopened", names));
                  })
                  // A refusal is shown in the dialog from the mutation's error.
                  .catch(() => undefined);
              }}
            >
              {reopen.isPending ? t("closed.reopening") : t("closed.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
