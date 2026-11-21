import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useAccountLabels } from "../../components/account-labels";

/** An Account: a stub until ticket 08 builds the Account area. */
export function AccountPage({
  householdId,
  accountId,
}: {
  householdId: string;
  accountId: string;
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
  return (
    <div className="mx-auto grid max-w-5xl gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
      <p className="text-muted-foreground">
        {labels.kind(account.kind)} · {account.currency} · {labels.balance(account)}
      </p>
      <p>{t("accountStub")}</p>
    </div>
  );
}
