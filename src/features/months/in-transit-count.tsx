import { Link } from "@tanstack/react-router";
import { ArrowLeftRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Month } from "../../lib/month";

/**
 * A month's Transfer legs In transit (cash-accounts-and-transfers spec,
 * "Closing a cash month"): information only, never among the blockers, since
 * they never stop a Month close. It links to the month's Transactions
 * filtered to In transit. Nothing when there are none.
 */
export function InTransitCount({
  householdId,
  accountId,
  month,
  count,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  count: number;
}) {
  const { t } = useTranslation("months");
  if (count <= 0) {
    return null;
  }
  return (
    <p className="flex items-center gap-2 text-sm">
      <ArrowLeftRightIcon aria-hidden="true" className="size-4" />
      <Link
        to="/households/$householdId/accounts/$accountId/transactions"
        params={{ householdId, accountId }}
        search={{ booking_month: month, in_transit: true }}
        className="underline underline-offset-4"
      >
        {t("inTransit", { count })}
      </Link>
    </p>
  );
}
