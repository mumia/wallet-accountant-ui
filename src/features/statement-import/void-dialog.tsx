import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FormAlert } from "../../components/form-alert";
import { useInfoToast } from "../../components/toaster";
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
import { useVoid, type StatementImport } from "./statement-import-query";

/** When an import was recorded (or voided), as the list and the dialog name it: "Feb 3, 2026". */
export function importedOn(dateTime: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(dateTime));
}

/**
 * Asks before voiding a Statement import (spec, "Void"), adding what happens
 * to the Opening balance when it is the Account's first import. A refusal
 * (something changed since the list was read) shows in the dialog; afterwards
 * a toast offers to import a statement.
 */
export function VoidDialog({
  householdId,
  accountId,
  statementImport,
  onClose,
}: {
  householdId: string;
  accountId: string;
  /** The import to void; none closes the dialog. */
  statementImport: StatementImport | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation("statementImport");
  const navigate = useNavigate();
  const toast = useInfoToast();
  const voiding = useVoid(householdId, accountId);
  // The last one asked about stays shown while the dialog closes.
  const [shown, setShown] = useState(statementImport);
  if (statementImport !== undefined && statementImport !== shown) {
    setShown(statementImport);
  }

  const confirm = (item: StatementImport) => {
    voiding.mutate(item, {
      onSuccess: () => {
        onClose();
        toast(t("void.done"), {
          label: t("void.importStatement"),
          onClick: () => {
            void navigate({
              to: "/households/$householdId/accounts/$accountId/statement-imports/new",
              params: { householdId, accountId },
            });
          },
        });
      },
    });
  };

  return (
    <Dialog
      open={statementImport !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          // The next import asked about starts without this one's refusal.
          voiding.reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        {shown !== undefined && (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("void.title", {
                  date: importedOn(shown.imported_at),
                  count: shown.rows_imported,
                })}
              </DialogTitle>
              <DialogDescription>
                {t("void.body")}
                {shown.opening_balance !== undefined && ` ${t("void.bodyFirst")}`}
              </DialogDescription>
            </DialogHeader>
            {voiding.isError && <FormAlert error={voiding.error} />}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>{t("void.cancel")}</DialogClose>
              <Button
                variant="destructive"
                disabled={voiding.isPending}
                onClick={() => {
                  confirm(shown);
                }}
              >
                {voiding.isPending ? t("void.voiding") : t("void.confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
