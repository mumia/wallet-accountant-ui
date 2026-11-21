import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import { kindKeys } from "../../components/account-labels";
import { CurrencyCombobox } from "../../components/currency-combobox";
import { DateInput } from "../../components/date-input";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { firstOfMonth, formatDate, today, type IsoDate } from "../../lib/date";

/** Every kind the contract lists, in this order; Cash is never offered (the backend refuses it). */
const kinds = Object.keys(kindKeys) as (keyof typeof kindKeys)[];

/** Add Account (spec, "Add Account"): the dialog, opened from the sidebar or the overview. */
export function AddAccountDialog({
  householdId,
  open,
  onOpenChange,
}: {
  householdId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("accounts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("add.title")}</DialogTitle>
          <DialogDescription>{t("add.description")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the defaults. */}
        {open && (
          <AddAccountForm
            householdId={householdId}
            onAdded={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddAccountForm({ householdId, onAdded }: { householdId: string; onAdded: () => void }) {
  const { t } = useTranslation("accounts");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nameId = useId();
  const kindId = useId();
  const currencyId = useId();
  const startId = useId();

  const path = { params: { path: { household_id: householdId } } };
  // The shell's loader has fetched the Household; its Base currency is the default.
  const { data: household } = api.useSuspenseQuery("get", "/households/{household_id}", path);
  const currencies = api.useQuery("get", "/currencies");
  const latest = today();

  const schema = z.object({
    name: z.string().trim().min(1, t("add.nameRequired")).max(200, t("add.nameTooLong")),
    kind: z.enum(kinds),
    currency: z.string().min(1, t("add.currencyRequired")),
    startDate: z
      .string()
      .min(1, t("add.startDateInvalid", { example: formatDate(firstOfMonth()) }))
      .refine((date) => date <= latest, t("add.startDateTooLate")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      kind: "BANK_ACCOUNT" as const,
      currency: household.base_currency,
      startDate: firstOfMonth(),
    },
  });
  const add = api.useMutation("post", "/households/{household_id}/accounts");

  const openAccount = async (accountId: string) => {
    onAdded();
    await queryClient.invalidateQueries({
      queryKey: ["get", "/households/{household_id}/accounts", path],
    });
    await navigate({
      to: "/households/$householdId/accounts/$accountId",
      params: { householdId, accountId },
    });
  };

  const { errors } = form.formState;
  const describedBy = (id: string, error: string | undefined, help?: string) =>
    [help, error === undefined ? undefined : `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(({ name, kind, currency, startDate }) => {
          add.mutate(
            { ...path, body: { name, kind, currency, start_date: startDate } },
            { onSuccess: (account) => void openAccount(account.account_id) },
          );
        })(event);
      }}
    >
      <FieldGroup>
        {add.isError && <FormAlert error={add.error} />}
        {currencies.isError && <FormAlert error={currencies.error} />}
        <Field data-invalid={errors.name !== undefined}>
          <FieldLabel htmlFor={nameId}>{t("add.name")}</FieldLabel>
          <Input
            id={nameId}
            autoComplete="off"
            placeholder={t("add.namePlaceholder")}
            aria-invalid={errors.name !== undefined}
            aria-describedby={describedBy(nameId, errors.name?.message)}
            {...form.register("name")}
          />
          {errors.name?.message !== undefined && (
            <FieldError id={`${nameId}-error`}>{errors.name.message}</FieldError>
          )}
        </Field>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <Field>
              <p id={kindId} className="text-sm font-medium">
                {t("add.kind")}
              </p>
              <RadioGroup
                aria-labelledby={kindId}
                value={field.value}
                onValueChange={(kind: (typeof kinds)[number]) => {
                  field.onChange(kind);
                }}
                className="grid-cols-2"
              >
                {kinds.map((kind) => (
                  <Label
                    key={kind}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3"
                  >
                    <RadioGroupItem value={kind} />
                    {tCommon(kindKeys[kind])}
                  </Label>
                ))}
              </RadioGroup>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="currency"
          render={({ field }) => (
            <Field data-invalid={errors.currency !== undefined}>
              <FieldLabel id={`${currencyId}-label`} htmlFor={currencyId}>
                {t("add.currency")}
              </FieldLabel>
              <CurrencyCombobox
                id={currencyId}
                label={{ id: `${currencyId}-label` }}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
                aria-invalid={errors.currency !== undefined}
                aria-describedby={describedBy(
                  currencyId,
                  errors.currency?.message,
                  `${currencyId}-help`,
                )}
              />
              <FieldDescription id={`${currencyId}-help`}>{t("add.currencyHelp")}</FieldDescription>
              {errors.currency?.message !== undefined && (
                <FieldError id={`${currencyId}-error`}>{errors.currency.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <Field data-invalid={errors.startDate !== undefined}>
              <FieldLabel htmlFor={startId}>{t("add.startDate")}</FieldLabel>
              <DateInput
                id={startId}
                value={field.value === "" ? null : (field.value as IsoDate)}
                onValueChange={(date) => {
                  field.onChange(date ?? "");
                }}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
                max={latest}
                aria-invalid={errors.startDate !== undefined}
                aria-describedby={describedBy(
                  startId,
                  errors.startDate?.message,
                  `${startId}-help`,
                )}
              />
              <FieldDescription id={`${startId}-help`}>{t("add.startDateHelp")}</FieldDescription>
              {errors.startDate?.message !== undefined && (
                <FieldError id={`${startId}-error`}>{errors.startDate.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? t("add.adding") : t("add.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
