import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { isProblem } from "../../api/problem";
import { FormAlert } from "../../components/form-alert";
import { mediumDate, rowLabel } from "../../components/row-label";
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
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { formatMoney } from "../../lib/money";
import {
  suggestionsParams,
  suggestionsPath,
  useAcceptTransfer,
  type ImportedTransaction,
} from "./to-review-query";

/** The radio for recording a new cash leg instead of Matching a suggested one. */
const recordNow = "record-now";

/** Another Accept took the leg first (backend spec, "Accept as Transfer"). */
const isLegTaken = (error: unknown) =>
  isProblem(error) &&
  error.type === "/problems/invalid-transfer" &&
  (error as { reason?: unknown }).reason === "NOT_A_MATCHING_LEG";

export interface Suggesting {
  row: ImportedTransaction;
  cash: { account_id: string; name: string };
}

/**
 * "Did you already note this in Wallet?" (cash-accounts-and-transfers spec,
 * "Accept as Transfer"): the cash Account's In transit legs that could be the
 * row's other side, closest first, as a radio group with "No, record it in
 * Wallet now" last. Confirming Accepts the row as a Transfer, Matching the
 * leg picked. A leg another Accept took first shows the problem as the
 * dialog's alert, and the suggestions are read again.
 */
export function TransferSuggestionsDialog({
  householdId,
  accountId,
  suggesting,
  onClose,
  onAccepted,
}: {
  householdId: string;
  accountId: string;
  suggesting: Suggesting | undefined;
  onClose: () => void;
  onAccepted: (row: ImportedTransaction) => void;
}) {
  return (
    <Dialog
      open={suggesting !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        {suggesting !== undefined && (
          <Suggestions
            // A new row starts the choice and the alert over.
            key={`${suggesting.row.imported_transaction_id}-${suggesting.cash.account_id}`}
            householdId={householdId}
            accountId={accountId}
            suggesting={suggesting}
            onAccepted={onAccepted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Suggestions({
  householdId,
  accountId,
  suggesting: { row, cash },
  onAccepted,
}: {
  householdId: string;
  accountId: string;
  suggesting: Suggesting;
  onAccepted: (row: ImportedTransaction) => void;
}) {
  const { t } = useTranslation("toReview");
  const { api } = useApi();
  const titleId = useId();
  const accept = useAcceptTransfer(householdId, accountId);
  // The tab fetched them before opening the dialog: this reads the cache.
  const suggestions = api.useQuery(
    "get",
    suggestionsPath,
    suggestionsParams(householdId, row.imported_transaction_id, cash.account_id),
  );
  const items = suggestions.data?.items ?? [];
  const [choice, setChoice] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [waiting, setWaiting] = useState(false);

  // The closest leg is picked until the member picks; one gone since falls back to it.
  const picked =
    choice !== undefined &&
    (choice === recordNow || items.some(({ transaction_id }) => transaction_id === choice))
      ? choice
      : (items[0]?.transaction_id ?? recordNow);

  const confirm = async () => {
    setWaiting(true);
    setError(undefined);
    try {
      await accept(row, cash.account_id, picked === recordNow ? undefined : picked);
      onAccepted(row);
    } catch (caught) {
      setError(caught);
      if (isLegTaken(caught)) {
        setChoice(undefined);
        await suggestions.refetch();
      }
    } finally {
      setWaiting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle id={titleId}>{t("suggestions.title", { account: cash.name })}</DialogTitle>
        <DialogDescription>
          {t("suggestions.description", { row: rowLabel(row), account: cash.name })}
        </DialogDescription>
      </DialogHeader>
      {error !== undefined && <FormAlert error={error} />}
      <RadioGroup
        aria-labelledby={titleId}
        value={picked}
        onValueChange={(next: string) => {
          setChoice(next);
        }}
      >
        {items.map((leg) => (
          <Label
            key={leg.transaction_id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal"
          >
            <RadioGroupItem value={leg.transaction_id} />
            <span className="grid gap-0.5">
              <span>{leg.description}</span>
              <span className="text-sm text-muted-foreground">
                {mediumDate(leg.transaction_date)} · {formatMoney(leg.amount)}
              </span>
            </span>
          </Label>
        ))}
        <Label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal">
          <RadioGroupItem value={recordNow} />
          {t("suggestions.recordNow", { account: cash.name })}
        </Label>
      </RadioGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{t("suggestions.cancel")}</DialogClose>
        <Button disabled={waiting || suggestions.isFetching} onClick={() => void confirm()}>
          {t("suggestions.accept")}
        </Button>
      </DialogFooter>
    </>
  );
}
