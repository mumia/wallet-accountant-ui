import { Link } from "@tanstack/react-router";
import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { isProblem } from "../../api/problem";
import type { components } from "../../api/schema.gen";
import { useErrorText } from "../../components/error-text";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { formatMoney, type Money } from "../../lib/money";

type RowError = components["schemas"]["RowError"];

/** How many unreadable lines are listed; the rest are counted. */
const shownRows = 20;

/**
 * What a refused statement carries beyond `title` and `detail`. The UI keeps no
 * list of problem types: a problem is read by the fields it has.
 */
export type RefusalShape =
  | { kind: "rows"; rows: RowError[] }
  | { kind: "balance"; expected: Money; exportBalance: Money; difference: Money }
  | { kind: "earlier-import"; statementImportId: string }
  | { kind: "plain" };

function isMoney(value: unknown): value is Money {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { amount, currency } = value as Record<string, unknown>;
  return typeof amount === "string" && typeof currency === "string";
}

function isRowError(value: unknown): value is RowError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { line, reason } = value as Record<string, unknown>;
  return typeof line === "number" && typeof reason === "string";
}

export function refusalShape(error: unknown): RefusalShape {
  if (!isProblem(error)) {
    return { kind: "plain" };
  }
  const fields = error as Record<string, unknown>;
  const { rows, expected_balance, export_balance, difference, statement_import_id } = fields;
  if (Array.isArray(rows) && rows.length > 0 && rows.every(isRowError)) {
    return { kind: "rows", rows };
  }
  if (isMoney(expected_balance) && isMoney(export_balance) && isMoney(difference)) {
    return {
      kind: "balance",
      expected: expected_balance,
      exportBalance: export_balance,
      difference,
    };
  }
  if (typeof statement_import_id === "string") {
    return { kind: "earlier-import", statementImportId: statement_import_id };
  }
  return { kind: "plain" };
}

/**
 * A refused preview or upload, as the alert of the step that sent it (spec,
 * "Statement import flow": Refusals). The inputs stay; `children` adds the
 * step's own way on, such as "Back to the file".
 */
export function Refusal({
  error,
  householdId,
  accountId,
  connectionId,
  children,
}: {
  error: unknown;
  householdId: string;
  accountId: string;
  connectionId: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation("statementImport");
  const { title, detail } = useErrorText(error);
  const shape = refusalShape(error);
  const params = { householdId, accountId };
  const linkClass = "font-medium text-foreground underline underline-offset-4";
  const editMapping = (
    <Link
      to="/households/$householdId/accounts/$accountId/connections/$connectionId"
      params={{ ...params, connectionId }}
      className={linkClass}
    >
      {t("refusal.editMapping")}
    </Link>
  );

  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="grid gap-3">
        {detail !== undefined && <p>{detail}</p>}
        {shape.kind === "rows" && (
          <>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-foreground">
                <caption className="sr-only">{t("refusal.unreadableRows")}</caption>
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="py-1 pr-4 font-medium">
                      {t("refusal.line")}
                    </th>
                    <th scope="col" className="py-1 font-medium">
                      {t("refusal.reason")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shape.rows.slice(0, shownRows).map((row) => (
                    <tr key={row.line} className="border-b last:border-0">
                      <td className="py-1 pr-4 align-top tabular-nums">{row.line}</td>
                      <td className="py-1">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shape.rows.length > shownRows && (
              <p>{t("refusal.moreRows", { count: shape.rows.length - shownRows })}</p>
            )}
            <p>{editMapping}</p>
          </>
        )}
        {shape.kind === "balance" && (
          <>
            <dl className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1 text-foreground">
              <dt>{t("refusal.expected")}</dt>
              <dd className="text-right tabular-nums">{formatMoney(shape.expected)}</dd>
              <dt>{t("refusal.exportBalance")}</dt>
              <dd className="text-right tabular-nums">{formatMoney(shape.exportBalance)}</dd>
              <dt>{t("refusal.difference")}</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatMoney(shape.difference)}
              </dd>
            </dl>
            <p>{t("refusal.balanceHint")}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              {editMapping}
              <Link
                to="/households/$householdId/accounts/$accountId/statement-imports"
                params={params}
                className={linkClass}
              >
                {t("refusal.statementImports")}
              </Link>
            </p>
          </>
        )}
        {shape.kind === "earlier-import" && (
          <p>
            <Link
              to="/households/$householdId/accounts/$accountId/statement-imports"
              params={params}
              search={{ statement_import_id: shape.statementImportId }}
              className={linkClass}
            >
              {t("refusal.earlierImport")}
            </Link>
          </p>
        )}
        {children}
      </AlertDescription>
    </Alert>
  );
}
