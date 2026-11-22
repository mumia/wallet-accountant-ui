import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { formatMoney } from "../../lib/money";
import type { StatementImport } from "./statement-import-query";
import { Stat } from "./stat";

/**
 * The Balance check values the contract lists. It is an extensible enum: an
 * unknown value is shown as it comes.
 */
export const balanceChecks = ["PASSED", "WAITING", "FAILED"] as const;
type KnownBalanceCheck = (typeof balanceChecks)[number];

function isKnown(value: string): value is KnownBalanceCheck {
  return (balanceChecks as readonly string[]).includes(value);
}

/**
 * Step 4: what was imported, skipped and suspected, and the way to To review.
 * It lives in page memory only: the Statement imports tab shows the same counts.
 */
export function ResultStep({
  householdId,
  accountId,
  result,
}: {
  householdId: string;
  accountId: string;
  result: StatementImport;
}) {
  const { t } = useTranslation("statementImport");
  const params = { householdId, accountId };
  const check = result.balance_check;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <CheckIcon className="size-4" />
          </span>
          <h3>{t("result.title")}</h3>
        </CardTitle>
        <CardDescription>
          {t("result.balanceCheck")}{" "}
          <span className="font-medium text-foreground">
            {isKnown(check) ? t(`result.checks.${check}`) : check}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("result.imported")} value={String(result.rows_imported)} />
          <Stat
            label={t("result.skipped")}
            value={String(result.rows_skipped_as_certain_repeats)}
          />
          <Stat label={t("result.suspected")} value={String(result.suspected_duplicates)} />
          <Stat label={t("result.ignored")} value={String(result.rows_ignored_before_start_date)} />
          {result.opening_balance !== undefined && (
            <Stat label={t("result.opening")} value={formatMoney(result.opening_balance)} />
          )}
        </dl>
        {result.rows_imported === 0 && <p className="font-medium">{t("result.nothingNew")}</p>}
      </CardContent>
      <CardFooter className="flex-wrap justify-end gap-2">
        <Link
          to="/households/$householdId/accounts/$accountId"
          params={params}
          className={buttonVariants({
            variant: result.rows_imported === 0 ? "default" : "outline",
          })}
        >
          {t("result.backToAccount")}
        </Link>
        {result.rows_imported > 0 && (
          <Link
            to="/households/$householdId/accounts/$accountId/to-review"
            params={params}
            search={result.suspected_duplicates > 0 ? { state: "SUSPECTED_DUPLICATE" } : {}}
            className={buttonVariants()}
          >
            {t("result.review", { count: result.rows_imported })}
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
