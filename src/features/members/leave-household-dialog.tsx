import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { FormAlert } from "../../components/form-alert";
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
import { forgetLastHousehold } from "../../lib/last-household";

/**
 * Asks before the User leaves the Household (spec, "Revoke, Remove and
 * Leave"), then takes them to `/`: another Household, or Create Household when
 * it was their only one. A refusal is the dialog's alert: 409 `last-member`
 * when the other members left meanwhile.
 */
export function LeaveHouseholdDialog({
  householdId,
  householdName,
  userId,
  open,
  onOpenChange,
}: {
  householdId: string;
  householdName: string;
  /** The User's own User ID. */
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("members");
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const leave = api.useMutation("delete", "/households/{household_id}/members/{user_id}");

  const confirm = () => {
    leave
      .mutateAsync({ params: { path: { household_id: householdId, user_id: userId } } })
      .then(async () => {
        // `/` must not lead back here, and must see the list without it.
        forgetLastHousehold(householdId);
        await queryClient.invalidateQueries({
          queryKey: api.queryOptions("get", "/households").queryKey,
        });
        await navigate({ to: "/" });
      })
      // A refusal is the dialog's alert, from the mutation's state.
      .catch(() => undefined);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (leave.isError) {
            // A refusal means the members changed: Leave may be disabled now.
            void queryClient.invalidateQueries({
              queryKey: api.queryOptions("get", "/households/{household_id}/members", {
                params: { path: { household_id: householdId } },
              }).queryKey,
            });
          }
          leave.reset();
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leave.title", { household: householdName })}</AlertDialogTitle>
          <AlertDialogDescription>{t("leave.body")}</AlertDialogDescription>
        </AlertDialogHeader>
        {leave.isError && <FormAlert error={leave.error} />}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("leave.cancel")}</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={leave.isPending || leave.isSuccess}
            onClick={confirm}
          >
            {leave.isPending || leave.isSuccess ? t("leave.leaving") : t("leave.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
