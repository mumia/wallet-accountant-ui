import { CircleAlertIcon, InfoIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "../../components/form-alert";
import { mediumDate } from "../../components/row-label";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { formatMoney } from "../../lib/money";
import type { CsvMappingTest } from "./connection-query";

/** How many unreadable lines are listed; the rest are counted. */
const shownUnreadable = 20;

/**
 * "How rows will read" (spec, "CSV mapping editor"): the backend's reading of
 * the sample with the unsaved mapping, never a second parser in the browser.
 */
export function MappingTest({
  hasSample,
  result,
  stale,
  pending,
  error,
  onRun,
}: {
  hasSample: boolean;
  /** The last reading, if any. */
  result: CsvMappingTest | undefined;
  /** The mapping changed since `result` was read. */
  stale: boolean;
  pending: boolean;
  error: unknown;
  onRun: () => void;
}) {
  const { t } = useTranslation("connections");
  if (!hasSample) {
    return <p className="text-sm text-muted-foreground">{t("test.needsSample")}</p>;
  }
  return (
    <div className="grid gap-4">
      <div>
        <Button type="button" variant="outline" disabled={pending} onClick={onRun}>
          {pending ? t("test.running") : t("test.run")}
        </Button>
      </div>
      <div aria-live="polite" className="grid gap-4">
        {error !== null && error !== undefined && <FormAlert error={error} />}
        {result !== undefined && stale && (
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>{t("test.stale")}</AlertDescription>
          </Alert>
        )}
        {result !== undefined && <TestResult result={result} />}
      </div>
    </div>
  );
}

function TestResult({ result }: { result: CsvMappingTest }) {
  const { t } = useTranslation("connections");
  const { rows, readable_row_count, unreadable_rows } = result;
  const has = {
    transactionDate: rows.some((row) => row.transaction_date !== row.booking_date),
    valueDate: rows.some((row) => row.value_date !== undefined),
    payee: rows.some((row) => row.payee !== undefined),
    bankTransactionId: rows.some((row) => row.bank_transaction_id !== undefined),
  };
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        {t("test.readable", { count: readable_row_count })}
        {rows.length > 0 && <> · {t("test.first", { count: rows.length })}</>}
      </p>
      {rows.length > 0 && (
        <div className="max-w-full overflow-x-auto rounded-lg border">
          <Table>
            <TableCaption className="sr-only">{t("test.tableCaption")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t("test.columns.line")}</TableHead>
                <TableHead>{t("test.columns.bookingDate")}</TableHead>
                {has.transactionDate && <TableHead>{t("test.columns.transactionDate")}</TableHead>}
                {has.valueDate && <TableHead>{t("test.columns.valueDate")}</TableHead>}
                <TableHead>{t("test.columns.description")}</TableHead>
                {has.payee && <TableHead>{t("test.columns.payee")}</TableHead>}
                {has.bankTransactionId && (
                  <TableHead>{t("test.columns.bankTransactionId")}</TableHead>
                )}
                <TableHead className="text-right">{t("test.columns.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.line}>
                  <TableCell className="tabular text-right">{row.line}</TableCell>
                  <TableCell>{mediumDate(row.booking_date)}</TableCell>
                  {has.transactionDate && <TableCell>{mediumDate(row.transaction_date)}</TableCell>}
                  {has.valueDate && (
                    <TableCell>
                      {row.value_date === undefined ? "" : mediumDate(row.value_date)}
                    </TableCell>
                  )}
                  <TableCell>{row.description}</TableCell>
                  {has.payee && <TableCell>{row.payee ?? ""}</TableCell>}
                  {has.bankTransactionId && <TableCell>{row.bank_transaction_id ?? ""}</TableCell>}
                  <TableCell className="tabular text-right">{formatMoney(row.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {unreadable_rows.length > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("test.unreadable", { count: unreadable_rows.length })}</AlertTitle>
          <AlertDescription className="grid gap-2">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <caption className="sr-only">{t("test.unreadableCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-1 pr-4 font-medium">
                      {t("test.columns.line")}
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      {t("test.columns.reason")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unreadable_rows.slice(0, shownUnreadable).map((row) => (
                    <tr key={row.line}>
                      <td className="tabular py-1 pr-4 align-top">{row.line}</td>
                      <td className="py-1">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {unreadable_rows.length > shownUnreadable && (
              <p>{t("test.more", { count: unreadable_rows.length - shownUnreadable })}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
