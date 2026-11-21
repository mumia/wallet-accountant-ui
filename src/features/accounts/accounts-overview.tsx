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

/**
 * The Household's home (spec, "Screens and routes"): its Accounts with their
 * balance and Account currency, from `GET …/accounts` alone. To review counts
 * and the open month come with ticket 19.
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
                    <TableCell
                      className={
                        account.balance === undefined
                          ? "pr-4 text-right text-muted-foreground"
                          : "pr-4 text-right tabular-nums"
                      }
                    >
                      {labels.balance(account)}
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
