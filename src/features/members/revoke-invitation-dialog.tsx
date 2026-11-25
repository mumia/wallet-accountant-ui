import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { errorStatus } from "../../api/problem";
import type { components } from "../../api/schema.gen";
import { errorText } from "../../components/error-text";
import { FormAlert } from "../../components/form-alert";
import { useErrorToast } from "../../components/toaster";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";

type Invitation = components["schemas"]["Invitation"];

/**
 * Asks before revoking an open Invitation (spec, "Revoke, Remove and Leave").
 * A refusal shows in the dialog, except 404: the Invitation was redeemed,
 * revoked or expired since the list loaded, so the dialog closes, a toast says
 * so and the list is read again.
 */
export function RevokeInvitationDialog({
  householdId,
  invitation,
  onClose,
}: {
  householdId: string;
  /** The Invitation to revoke; none closes the dialog. */
  invitation: Invitation | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation("members");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const errorToast = useErrorToast();
  const revoke = api.useMutation(
    "delete",
    "/households/{household_id}/invitations/{invitation_id}",
  );
  // The last one asked about stays shown while the dialog closes.
  const [shown, setShown] = useState(invitation);
  if (invitation !== undefined && invitation !== shown) {
    setShown(invitation);
  }

  const refreshList = () =>
    queryClient.invalidateQueries({
      queryKey: api.queryOptions("get", "/households/{household_id}/invitations", {
        params: { path: { household_id: householdId } },
      }).queryKey,
    });

  const confirm = (item: Invitation) => {
    revoke.mutate(
      { params: { path: { household_id: householdId, invitation_id: item.invitation_id } } },
      {
        onSuccess: () => {
          void refreshList();
          onClose();
        },
        onError: (error) => {
          if (errorStatus(error) !== 404) {
            return;
          }
          revoke.reset();
          onClose();
          const { title, detail } = errorText(error, tCommon);
          errorToast(
            t("invitations.revokeDialog.gone"),
            detail === undefined ? title : `${title}: ${detail}`,
          );
          void refreshList();
        },
      },
    );
  };

  return (
    <AlertDialog
      open={invitation !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          // The next Invitation asked about starts without this one's refusal.
          revoke.reset();
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("invitations.revokeDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("invitations.revokeDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {revoke.isError && errorStatus(revoke.error) !== 404 && <FormAlert error={revoke.error} />}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("invitations.revokeDialog.cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={revoke.isPending || shown === undefined}
            onClick={() => {
              if (shown !== undefined) {
                confirm(shown);
              }
            }}
          >
            {revoke.isPending
              ? t("invitations.revokeDialog.revoking")
              : t("invitations.revokeDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
