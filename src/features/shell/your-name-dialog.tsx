import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import { FormAlert } from "../../components/form-alert";
import { meChanged } from "../../components/me";
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
import { displayNameSchema } from "../../lib/display-name";

/**
 * Your name (spec, "Display name"): the caller's display name, the name the
 * other members of their Households see, changed with `PATCH /me`.
 */
export function YourNameDialog({
  displayName,
  open,
  onOpenChange,
}: {
  displayName: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("shell");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("yourName.title")}</DialogTitle>
          <DialogDescription>{t("yourName.description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the current name. */}
        {open && (
          <YourNameForm
            displayName={displayName}
            onDone={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function YourNameForm({
  displayName,
  onDone,
}: {
  displayName: string | undefined;
  onDone: () => void;
}) {
  const { t } = useTranslation("shell");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const nameId = useId();
  const change = api.useMutation("patch", "/me");

  const schema = z.object({
    displayName: displayNameSchema({
      required: tCommon("displayName.required"),
      tooLong: tCommon("displayName.tooLong"),
    }),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { displayName: displayName ?? "" },
  });
  const nameError = form.formState.errors.displayName?.message;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(({ displayName: name }) => {
          change.mutate(
            { body: { display_name: name } },
            {
              onSuccess: (me) => {
                void meChanged(queryClient, me);
                onDone();
              },
            },
          );
        })(event);
      }}
    >
      <FieldGroup>
        {change.isError && <FormAlert error={change.error} />}
        <Field data-invalid={nameError !== undefined}>
          <FieldLabel htmlFor={nameId}>{tCommon("displayName.label")}</FieldLabel>
          <Input
            id={nameId}
            autoComplete="nickname"
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError === undefined ? undefined : `${nameId}-error`}
            {...form.register("displayName")}
          />
          {nameError !== undefined && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
        </Field>
        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? t("yourName.saving") : t("yourName.save")}
        </Button>
      </FieldGroup>
    </form>
  );
}
