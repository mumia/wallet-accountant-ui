import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";

/**
 * Rename Account (spec, "Rename Account"): one Name field, 1–200 characters.
 * The name is the only detail of an Account that can change.
 */
export function RenameAccountDialog({
  householdId,
  accountId,
  name,
  open,
  onOpenChange,
}: {
  householdId: string;
  accountId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("accounts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rename.title")}</DialogTitle>
          <DialogDescription>{t("rename.description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the current name. */}
        {open && (
          <RenameAccountForm
            householdId={householdId}
            accountId={accountId}
            name={name}
            onDone={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenameAccountForm({
  householdId,
  accountId,
  name,
  onDone,
}: {
  householdId: string;
  accountId: string;
  name: string;
  onDone: () => void;
}) {
  const { t } = useTranslation("accounts");
  const { api } = useApi();
  const queryClient = useQueryClient();
  const nameId = useId();
  const rename = api.useMutation("patch", "/households/{household_id}/accounts/{account_id}");

  const schema = z.object({
    name: z.string().trim().min(1, t("add.nameRequired")).max(200, t("add.nameTooLong")),
  });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name } });
  const nameError = form.formState.errors.name?.message;

  // The header and the sidebar both show the name.
  const refetch = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/accounts/{account_id}",
          { params: { path: { household_id: householdId, account_id: accountId } } },
        ],
      }),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/accounts",
          { params: { path: { household_id: householdId } } },
        ],
      }),
    ]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(({ name: newName }) => {
          rename.mutate(
            {
              params: { path: { household_id: householdId, account_id: accountId } },
              body: { name: newName },
            },
            {
              onSuccess: () => {
                void refetch();
                onDone();
              },
            },
          );
        })(event);
      }}
    >
      <FieldGroup>
        {rename.isError && <FormAlert error={rename.error} />}
        <Field data-invalid={nameError !== undefined}>
          <FieldLabel htmlFor={nameId}>{t("add.name")}</FieldLabel>
          <Input
            id={nameId}
            autoComplete="off"
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError === undefined ? undefined : `${nameId}-error`}
            {...form.register("name")}
          />
          {nameError !== undefined && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
        </Field>
        <Button type="submit" disabled={rename.isPending}>
          {t("rename.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
