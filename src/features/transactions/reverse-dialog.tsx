import { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { isMonthClosed } from "../../api/problem";
import { errorText } from "../../components/error-text";
import { mediumDate, rowLabel } from "../../components/row-label";
import { useErrorToast, useInfoToast } from "../../components/toaster";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { formatMonth, monthOf, type Month } from "../../lib/month";
import { formatMoney } from "../../lib/money";
import { reverseWarning } from "../../lib/transfers";
import type { components } from "../../api/schema.gen";
import { useReverse, type AccountTransaction } from "./transactions-query";

type AccountKind = components["schemas"]["AccountKind"];

/**
 * Asks before reversing a Transaction (spec, "Reverse"), with what happens to
 * its Imported transaction when an Accept recorded it, and to the other leg of
 * a Transfer (cash-accounts-and-transfers spec, "Reversing legs"). Afterwards
 * a toast offers to open the reversal; a refusal is a toast naming the row,
 * and a closed month names whose month it is.
 */
export function ReverseDialog({
  householdId,
  accountId,
  transaction,
  onClose,
}: {
  householdId: string;
  accountId: string;
  /** The Transaction to reverse; none closes the dialog. */
  transaction: AccountTransaction | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation("transactions");
  const { t: tCommon } = useTranslation();
  const navigate = useNavigate();
  const toast = useInfoToast();
  const errorToast = useErrorToast();
  const reverse = useReverse(householdId, accountId);
  const { api } = useApi();
  const accounts = api.useQuery("get", "/households/{household_id}/accounts", {
    params: { path: { household_id: householdId } },
  }).data?.items;
  const accountNamed = (id: string | undefined) =>
    accounts?.find(({ account_id }) => account_id === id);
  // The last one asked about stays shown while the dialog closes.
  const [shown, setShown] = useState(transaction);
  if (transaction !== undefined && transaction !== shown) {
    setShown(transaction);
  }

  const confirm = (original: AccountTransaction) => {
    // Awaited, not a mutate callback: the refetched list can unmount this
    // table (an empty Uncategorised filter) before a callback would run.
    void reverse
      .mutateAsync(original)
      .then((reversal) => {
        onClose();
        toast(
          t("reverse.done"),
          {
            label: t("reverse.open"),
            onClick: () => {
              void navigate({
                to: "/households/$householdId/accounts/$accountId/transactions",
                params: { householdId, accountId },
                search: {
                  booking_month: monthOf(reversal.booking_date),
                  transaction_id: reversal.transaction_id,
                },
              });
            },
          },
          original.imported_transaction_id === undefined ? undefined : t("reverse.backToReview"),
        );
      })
      .catch((error: unknown) => {
        onClose();
        const { title, detail } = errorText(error, tCommon);
        // Whose month it is: the Counterpart's, for a Transfer leg.
        const closedOn = isMonthClosed(error)
          ? accountNamed(error.account_id ?? accountId)
          : undefined;
        errorToast(
          t("reverse.failed", { row: rowLabel(original) }),
          isMonthClosed(error) && closedOn !== undefined
            ? t("reverse.monthClosed", {
                account: closedOn.name,
                month: formatMonth(error.booking_month as Month),
              })
            : detail === undefined
              ? title
              : `${title}: ${detail}`,
        );
      });
  };

  return (
    <Dialog
      open={transaction !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        {shown !== undefined && (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("reverse.title", {
                  description: shown.description,
                  amount: formatMoney(shown.amount),
                  date: mediumDate(shown.booking_date),
                })}
              </DialogTitle>
              <DialogDescription>
                {t("reverse.body")}{" "}
                {warningText(
                  t,
                  shown,
                  accountNamed(accountId),
                  accountNamed(shown.counterpart_account_id),
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>{t("reverse.cancel")}</DialogClose>
              <Button
                variant="destructive"
                disabled={reverse.isPending}
                onClick={() => {
                  confirm(shown);
                }}
              >
                {reverse.isPending ? t("reverse.reversing") : t("reverse.confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * What else the reversal changes: the other leg of a Matched Transfer
 * (`reverseWarning`), or else an Accepted row back To review.
 */
function warningText(
  t: TFunction<"transactions">,
  transaction: AccountTransaction,
  account: { kind: AccountKind } | undefined,
  counterpart: { kind: AccountKind; name: string } | undefined,
): string {
  const warning =
    account === undefined
      ? { kind: "none" as const }
      : reverseWarning(transaction, account, counterpart);
  if (warning.kind !== "none") {
    return t(`reverse.warning.${warning.kind}`, { counterpart: warning.counterpart });
  }
  return transaction.imported_transaction_id === undefined ? "" : t("reverse.bodyImported");
}
