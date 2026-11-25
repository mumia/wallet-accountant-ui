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

export type Member = components["schemas"]["Member"];

/**
 * Asks before removing another member (spec, "Revoke, Remove and Leave"). A
 * member who is gone already (404) closes the dialog with a toast, and the
 * list is read again; any other refusal is the dialog's alert.
 */
export function RemoveMemberDialog({
  householdId,
  householdName,
  member,
  memberName,
  onClose,
}: {
  householdId: string;
  householdName: string;
  /** The member to remove; none closes the dialog. */
  member: Member | undefined;
  /** How the screen names `member`. */
  memberName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation("members");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const errorToast = useErrorToast();
  const remove = api.useMutation("delete", "/households/{household_id}/members/{user_id}");
  // The last one asked about stays shown while the dialog closes.
  const [shown, setShown] = useState({ member, memberName });
  if (member !== undefined && member !== shown.member) {
    setShown({ member, memberName });
  }

  const close = () => {
    // The next member asked about starts without this one's refusal.
    remove.reset();
    onClose();
  };
  const refetchMembers = () =>
    queryClient.invalidateQueries({
      queryKey: api.queryOptions("get", "/households/{household_id}/members", {
        params: { path: { household_id: householdId } },
      }).queryKey,
    });

  const confirm = (userId: string, name: string) => {
    remove
      .mutateAsync({ params: { path: { household_id: householdId, user_id: userId } } })
      .then(() => {
        close();
        void refetchMembers();
      })
      .catch((error: unknown) => {
        // Gone already: someone else removed them, or they left.
        if (errorStatus(error) === 404) {
          close();
          const { title, detail } = errorText(error, tCommon);
          errorToast(
            t("remove.failed", { member: name }),
            detail === undefined ? title : `${title}: ${detail}`,
          );
          void refetchMembers();
        }
      });
  };

  return (
    <AlertDialog
      open={member !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <AlertDialogContent>
        {shown.member !== undefined && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("remove.title", { member: shown.memberName })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("remove.body", { household: householdName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {remove.isError && errorStatus(remove.error) !== 404 && (
              <FormAlert error={remove.error} />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{t("remove.cancel")}</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (shown.member !== undefined) {
                    confirm(shown.member.user_id, shown.memberName);
                  }
                }}
              >
                {remove.isPending ? t("remove.removing") : t("remove.confirm")}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
