import { ArrowLeftRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * A month's Transfer legs In transit (cash-accounts-and-transfers spec,
 * "Closing a cash month"): information only, never among the blockers, since
 * they never stop a Month close. Nothing when there are none.
 */
export function InTransitCount({ count }: { count: number }) {
  const { t } = useTranslation("months");
  if (count <= 0) {
    return null;
  }
  // Ticket 08 links this to Transactions filtered to In transit.
  return (
    <p className="flex items-center gap-2 text-sm">
      <ArrowLeftRightIcon aria-hidden="true" className="size-4" />
      {t("inTransit", { count })}
    </p>
  );
}
