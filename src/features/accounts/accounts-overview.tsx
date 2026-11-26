import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useAccountLabels } from "../../components/account-labels";
import { useOpenAddAccount } from "../../components/add-account";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { components } from "../../api/schema.gen";
import { toReviewCount } from "../../lib/account-months";
import { isCash } from "../../lib/account-query";
import { formatMonth, type Month } from "../../lib/month";

type Account = components["schemas"]["Account"];

/**
 * The Household's home (spec, "Screens and routes"): its Accounts with their
 * Account currency, To review count, open month and balance, from
 * `GET …/accounts` alone.
 */
export function AccountsOverview({ householdId }: { householdId: string }) {
  const { t } = useTranslation("accounts");
  const { api } = useApi();
  const labels = useAccountLabels();
  const openAddAccount = useOpenAddAccount();
  // The layout route's loader has fetched them already.
  const { data: accounts } = api.useSuspenseQuery("get", "/households/{household_id}/accounts", {
    params: { path: { household_id: householdId } },
  });

  const addAccount = (
    <Button variant="outline" onClick={openAddAccount}>
      <PlusIcon aria-hidden="true" />
      {t("addAccount")}
    </Button>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("overview.title")}</h1>
        {accounts.items.length > 0 && addAccount}
      </div>
      {accounts.items.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-start gap-3">
            <p>{t("overview.empty")}</p>
            {addAccount}
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t("overview.account")}</TableHead>
                  <TableHead>{t("overview.currency")}</TableHead>
                  <TableHead className="text-right">{t("overview.toReview")}</TableHead>
                  <TableHead>{t("overview.month")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("overview.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.items.map((account) => (
                  <TableRow key={account.account_id}>
                    <TableCell className="pl-4">
                      <Link
                        to="/households/$householdId/accounts/$accountId"
                        params={{ householdId, accountId: account.account_id }}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {account.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {labels.kind(account.kind)}
                      </div>
                    </TableCell>
                    <TableCell>{account.currency}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <ToReview householdId={householdId} account={account} />
                    </TableCell>
                    <TableCell>
                      {account.awaiting_first_statement_import ? (
                        <span className="text-muted-foreground">{labels.awaiting}</span>
                      ) : (
                        <Link
                          to="/households/$householdId/accounts/$accountId/months/$bookingMonth"
                          params={{
                            householdId,
                            accountId: account.account_id,
                            bookingMonth: account.open_month,
                          }}
                          className="underline-offset-4 hover:underline"
                        >
                          {t("overview.openMonth", {
                            month: formatMonth(account.open_month as Month),
                          })}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">
                      {account.balance === undefined ? (
                        // The month column already says it awaits its first import.
                        <span className="text-muted-foreground">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">{labels.awaiting}</span>
                        </span>
                      ) : (
                        labels.balance(account)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * The Account's rows To review, linking to its To review tab when there are
 * any; "—" for a cash Account.
 */
function ToReview({ householdId, account }: { householdId: string; account: Account }) {
  const { t } = useTranslation("accounts");
  if (isCash(account)) {
    // Kept by hand: it never has rows to review.
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t("overview.toReviewNone")}</span>
      </span>
    );
  }
  const count = toReviewCount(account);
  if (count === 0) {
    return <span className="text-muted-foreground">0</span>;
  }
  return (
    <Link
      to="/households/$householdId/accounts/$accountId/to-review"
      params={{ householdId, accountId: account.account_id }}
      aria-label={t("overview.toReviewLink", { count, account: account.name })}
      className="font-medium underline-offset-4 hover:underline"
    >
      {count}
    </Link>
  );
}
