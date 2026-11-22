import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { NamedConnection } from "../../components/connection-names";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { formatDateLong, type IsoDate } from "../../lib/date";
import { formatMoney } from "../../lib/money";
import { Refusal } from "./refusal";
import type { StatementImportPreview } from "./statement-import-query";
import { Stat } from "./stat";

/**
 * Step 3, on a first import only: the Opening balance the import would record,
 * how it comes about, and Confirm. Nothing is recorded until then.
 */
export function PreviewStep({
  householdId,
  accountId,
  preview,
  fileName,
  connection,
  pending,
  error,
  onBack,
  onConfirm,
}: {
  householdId: string;
  accountId: string;
  preview: StatementImportPreview;
  fileName: string;
  connection: NamedConnection;
  pending: boolean;
  error: unknown;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation("statementImport");
  const startDate = formatDateLong(preview.start_date as IsoDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("preview.title")}</h3>
        </CardTitle>
        <CardDescription>{t("preview.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error !== null && (
          <Refusal
            error={error}
            householdId={householdId}
            accountId={accountId}
            connectionId={connection.connection.connection_id}
          >
            <p>
              <Button variant="outline" size="sm" onClick={onBack}>
                {t("preview.backToFile")}
              </Button>
            </p>
          </Refusal>
        )}
        <div className="rounded-lg bg-primary/5 p-4 ring-1 ring-primary/20">
          <p className="text-sm text-muted-foreground">
            {t("preview.openingOn", { date: startDate })}
          </p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatMoney(preview.opening_balance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {t("preview.formula", {
              exportBalance: formatMoney(preview.export_balance),
              rowsTotal: formatMoney(preview.rows_total),
            })}
          </p>
        </div>
        {preview.row_count === 0 && (
          <Alert>
            <TriangleAlertIcon aria-hidden="true" />
            <AlertDescription>{t("preview.noRows")}</AlertDescription>
          </Alert>
        )}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label={t("preview.rowsToImport")} value={String(preview.row_count)} />
          <Stat
            label={t("preview.rowsIgnored")}
            value={String(preview.rows_ignored_before_start_date)}
          />
          <Stat label={t("preview.rowsTotal")} value={formatMoney(preview.rows_total)} />
          <Stat label={t("preview.file")} value={fileName} text />
          <Stat label={t("preview.connection")} value={connection.name} text />
        </dl>
        {preview.rows_ignored_before_start_date > 0 && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("preview.ignoredNote", {
              count: preview.rows_ignored_before_start_date,
              date: startDate,
            })}
          </p>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          {t("preview.back")}
        </Button>
        <Button disabled={pending} onClick={onConfirm}>
          {pending ? t("preview.confirming") : t("preview.confirm")}
        </Button>
      </CardFooter>
    </Card>
  );
}
