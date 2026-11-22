import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
import { monthOf } from "../../lib/month";
import { formatMoney } from "../../lib/money";
import { useReverse, type AccountTransaction } from "./transactions-query";

/**
 * Asks before reversing a Transaction (spec, "Reverse"), with what happens to
 * its Imported transaction when an Accept recorded it. Afterwards a toast
 * offers to open the reversal; a refusal is a toast naming the row.
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
        errorToast(
          t("reverse.failed", { row: rowLabel(original) }),
          detail === undefined ? title : `${title}: ${detail}`,
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
                {t("reverse.body")}
                {shown.imported_transaction_id !== undefined && ` ${t("reverse.bodyImported")}`}
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
