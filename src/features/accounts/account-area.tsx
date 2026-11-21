import { Link, useSearch } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useAccountLabels } from "../../components/account-labels";
import { buttonVariants } from "../../components/ui/button";

const tabClass =
  "inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground";

/**
 * An Account's area (spec, "Screens and routes"): its header with "Import
 * statement", and the tabs To review, Transactions, Months, Statement imports
 * and Connections. While the Account awaits its first Statement import no tab
 * is selected and the getting-started checklist shows.
 */
export function AccountArea({
  householdId,
  accountId,
  children,
}: {
  householdId: string;
  accountId: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("accounts");
  const { api } = useApi();
  const labels = useAccountLabels();
  // The route's loader has fetched it already.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  // To review and Transactions share the month being looked at.
  const { booking_month } = useSearch({ strict: false });
  const params = { householdId, accountId };
  const month = { booking_month };

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {labels.kind(account.kind)} · {account.currency} ·{" "}
            <span className="tabular-nums">{labels.balance(account)}</span>
          </p>
        </div>
        <Link
          to="/households/$householdId/accounts/$accountId/statement-imports/new"
          params={params}
          className={buttonVariants()}
        >
          <UploadIcon aria-hidden="true" />
          {t("area.importStatement")}
        </Link>
      </header>
      <nav aria-label={t("area.tabs")} className="flex overflow-x-auto border-b">
        <Link
          to="/households/$householdId/accounts/$accountId/to-review"
          params={params}
          search={month}
          className={tabClass}
        >
          {t("area.toReview")}
        </Link>
        <Link
          to="/households/$householdId/accounts/$accountId/transactions"
          params={params}
          search={month}
          className={tabClass}
        >
          {t("area.transactions")}
        </Link>
        <Link
          to="/households/$householdId/accounts/$accountId/months"
          params={params}
          className={tabClass}
        >
          {t("area.months")}
        </Link>
        <Link
          to="/households/$householdId/accounts/$accountId/statement-imports"
          params={params}
          activeOptions={{ exact: true }}
          className={tabClass}
        >
          {t("area.statementImports")}
        </Link>
        <Link
          to="/households/$householdId/accounts/$accountId/connections"
          params={params}
          className={tabClass}
        >
          {t("area.connections")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
