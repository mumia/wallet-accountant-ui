import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useConnectionNames } from "../../components/connection-names";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { addMonths, formatMonth, type Month } from "../../lib/month";
import { formatMoney } from "../../lib/money";
import { useAccountStatementImports, type StatementImport } from "./statement-import-query";
import { VoidDialog, importedOn } from "./void-dialog";

/** The Balance check values the contract lists. It is an extensible enum: an unknown value is shown as sent. */
const checks = ["PASSED", "WAITING", "FAILED"] as const;
const isKnownCheck = (check: string): check is (typeof checks)[number] =>
  (checks as readonly string[]).includes(check);

/** The reasons `void_blocked_by` lists; likewise extensible. */
const blocks = ["NOT_LATEST", "HAS_ACCEPTED_ROWS", "TOUCHES_CLOSED_MONTH"] as const;
const isKnownBlock = (block: string): block is (typeof blocks)[number] =>
  (blocks as readonly string[]).includes(block);

const rowId = (statementImportId: string) => `statement-import-${statementImportId}`;

/**
 * The Statement imports tab (spec, "Statement imports tab"): every import of
 * the Account's Connections, newest first, with its Balance check, and Void
 * when `void_blocked_by` allows it (otherwise why not, and where to fix it).
 * `highlighted` (`?statement_import_id=`) marks one and brings it into view.
 */
export function StatementImportsTab({
  householdId,
  accountId,
  highlighted,
}: {
  householdId: string;
  accountId: string;
  highlighted: string | undefined;
}) {
  const { t } = useTranslation("statementImport");
  const { api } = useApi();
  const path = { params: { path: { household_id: householdId, account_id: accountId } } };
  // The route's loaders have fetched these.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    path,
  );
  const { data: connectionList } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/connections",
    path,
  );
  const names = new Map(
    useConnectionNames(connectionList.items).map(({ connection, name }) => [
      connection.connection_id,
      name,
    ]),
  );
  const imports = useAccountStatementImports(householdId, connectionList.items);
  const [voiding, setVoiding] = useState<StatementImport>();

  // The highlighted import is brought into view and focused once.
  const focused = useRef<string>(undefined);
  useEffect(() => {
    if (highlighted === undefined || focused.current === highlighted) {
      return;
    }
    const element = document.getElementById(rowId(highlighted));
    if (element !== null) {
      focused.current = highlighted;
      element.scrollIntoView({ block: "center" });
      element.focus({ preventScroll: true });
    }
  });

  if (imports.length === 0) {
    return (
      <section aria-label={t("list.title")}>
        <Card>
          <CardContent className="grid justify-items-start gap-3">
            <p>{t("list.empty")}</p>
            <Link
              to="/households/$householdId/accounts/$accountId/statement-imports/new"
              params={{ householdId, accountId }}
              className={buttonVariants()}
            >
              {t("void.importStatement")}
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label={t("list.title")}>
      <VoidDialog
        householdId={householdId}
        accountId={accountId}
        statementImport={voiding}
        onClose={() => {
          setVoiding(undefined);
        }}
      />
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("list.columns.imported")}</TableHead>
                <TableHead>{t("list.columns.connection")}</TableHead>
                <TableHead className="text-right">{t("list.columns.exportBalance")}</TableHead>
                <TableHead>{t("list.columns.rows")}</TableHead>
                <TableHead>{t("list.columns.balanceCheck")}</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">{t("list.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((item) => (
                <TableRow
                  key={item.statement_import_id}
                  id={rowId(item.statement_import_id)}
                  {...(item.statement_import_id === highlighted
                    ? { tabIndex: -1, "aria-current": "true" as const, "data-highlighted": "" }
                    : {})}
                  className={cn(
                    "align-top data-highlighted:bg-primary/10 data-highlighted:outline-none",
                    item.voided_at !== undefined && "text-muted-foreground",
                  )}
                >
                  <TableCell className="pl-4">
                    <div className="grid">
                      <span>{importedOn(item.imported_at)}</span>
                      {item.voided_at !== undefined && (
                        <span className="text-xs">
                          {t("list.voidedOn", { date: importedOn(item.voided_at) })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{names.get(item.connection_id) ?? item.connection_id}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div className="grid">
                      <span>{formatMoney(item.export_balance)}</span>
                      {item.opening_balance !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {t("list.openingBalance", {
                            amount: formatMoney(item.opening_balance),
                          })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <RowCounts item={item} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <BalanceCheck item={item} />
                  </TableCell>
                  <TableCell className="pr-4 whitespace-normal">
                    {item.voided_at === undefined && (
                      <VoidAction
                        householdId={householdId}
                        accountId={accountId}
                        item={item}
                        openMonth={account.open_month as Month}
                        onVoid={() => {
                          setVoiding(item);
                        }}
                      />
                    )}
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

function RowCounts({ item }: { item: StatementImport }) {
  const { t } = useTranslation("statementImport");
  const ignored = item.rows_ignored_before_start_date + item.rows_ignored_in_closed_months;
  return (
    <div className="grid text-sm">
      <span>
        {t("list.rows", {
          imported: item.rows_imported,
          skipped: item.rows_skipped_as_certain_repeats,
          suspected: item.suspected_duplicates,
        })}
      </span>
      {ignored > 0 && (
        <span className="text-xs text-muted-foreground">
          {t("list.ignored", { count: ignored })}
        </span>
      )}
    </div>
  );
}

/** The Balance check as a badge: always text, the colour only a hint. */
function BalanceCheck({ item }: { item: StatementImport }) {
  const { t } = useTranslation("statementImport");
  const check = item.balance_check;
  const failed = check === "FAILED" && item.voided_at === undefined;
  return (
    <div className="grid justify-items-start gap-1">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          failed && "border-destructive text-destructive",
          check === "PASSED" && item.voided_at === undefined && "border-primary bg-primary/10",
        )}
      >
        {isKnownCheck(check) ? t(`list.checks.${check}`) : check}
      </span>
      {failed && <span className="text-xs">{t("list.failedHint")}</span>}
    </div>
  );
}

/**
 * Void, enabled only when `void_blocked_by` is empty; otherwise disabled with
 * each reason and, where there is one, the way to fix it.
 */
function VoidAction({
  householdId,
  accountId,
  item,
  openMonth,
  onVoid,
}: {
  householdId: string;
  accountId: string;
  item: StatementImport;
  openMonth: Month;
  onVoid: () => void;
}) {
  const { t } = useTranslation("statementImport");
  const reasonsId = useId();
  const blocked = item.void_blocked_by.length > 0;
  const params = { householdId, accountId };
  const linkClass = "text-xs font-medium underline underline-offset-4";
  const latestClosed = addMonths(openMonth, -1);
  return (
    <div className="grid min-w-44 justify-items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={blocked}
        aria-label={t("list.voidFor", { date: importedOn(item.imported_at) })}
        {...(blocked ? { "aria-describedby": reasonsId } : {})}
        onClick={onVoid}
      >
        {t("list.void")}
      </Button>
      {blocked && (
        <ul id={reasonsId} className="grid gap-1 text-xs text-muted-foreground">
          {item.void_blocked_by.map((block) => (
            <li key={block} className="grid justify-items-start">
              <span>{isKnownBlock(block) ? t(`list.blocked.${block}`) : block}</span>
              {block === "HAS_ACCEPTED_ROWS" && (
                <Link
                  to="/households/$householdId/accounts/$accountId/transactions"
                  params={params}
                  search={{ booking_month: openMonth }}
                  className={linkClass}
                >
                  {t("list.blocked.HAS_ACCEPTED_ROWS_fix")}
                </Link>
              )}
              {block === "TOUCHES_CLOSED_MONTH" && (
                <Link
                  to="/households/$householdId/accounts/$accountId/months/$bookingMonth"
                  params={{ ...params, bookingMonth: latestClosed }}
                  className={linkClass}
                >
                  {t("list.blocked.TOUCHES_CLOSED_MONTH_fix", {
                    month: formatMonth(latestClosed),
                  })}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
