import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import { kindKeys } from "../../components/account-labels";
import { AmountInput } from "../../components/amount-input";
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
import type { Decimal } from "../../lib/money";

/** The kinds, in the contract's order: the four statement kinds, then Cash. */
const kinds = Object.keys(kindKeys) as (keyof typeof kindKeys)[];
type Kind = (typeof kinds)[number];

/** A new Account's start date: today for Cash, counted now; else the 1st of the month. */
const defaultStartDate = (kind: Kind) => (kind === "CASH" ? today() : firstOfMonth());

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
      {/* Five kinds and Cash's two counts can be taller than a small screen: it scrolls. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
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

  const schema = z
    .object({
      name: z.string().trim().min(1, t("add.nameRequired")).max(200, t("add.nameTooLong")),
      kind: z.enum(kinds),
      currency: z.string().min(1, t("add.currencyRequired")),
      startDate: z
        .string()
        .min(1, t("add.startDateInvalid", { example: formatDate(firstOfMonth()) }))
        .refine((date) => date <= latest, t("add.startDateTooLate")),
      // Only a cash Account has the Opening count, typed twice.
      openingCount: z.custom<Decimal | null>(),
      openingCountAgain: z.custom<Decimal | null>(),
    })
    .superRefine(({ kind, openingCount, openingCountAgain }, context) => {
      if (kind !== "CASH") {
        return;
      }
      if (openingCount === null) {
        context.addIssue({
          code: "custom",
          path: ["openingCount"],
          message: t("add.openingCountRequired"),
        });
      }
      if (openingCountAgain === null) {
        context.addIssue({
          code: "custom",
          path: ["openingCountAgain"],
          message: t("add.openingCountAgainRequired"),
        });
      } else if (openingCount !== null && openingCount !== openingCountAgain) {
        // Both are canonical decimal text in the currency's places, so equal counts read alike.
        context.addIssue({
          code: "custom",
          path: ["openingCountAgain"],
          message: t("add.openingCountsDiffer"),
        });
      }
    });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      kind: "BANK_ACCOUNT" as Kind,
      currency: household.base_currency,
      startDate: defaultStartDate("BANK_ACCOUNT"),
      openingCount: null,
      openingCountAgain: null,
    },
  });
  // Switching the kind moves the start date to the kind's default, until the member picks one.
  const [startDateEdited, setStartDateEdited] = useState(false);
  const [kind, currency] = useWatch({ control: form.control, name: ["kind", "currency"] });
  const cash = kind === "CASH";
  const decimalPlaces =
    currencies.data?.items.find(({ code }) => code === currency)?.decimal_places ?? 2;
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
        void form.handleSubmit((values) => {
          const counts =
            values.kind === "CASH" &&
            values.openingCount !== null &&
            values.openingCountAgain !== null
              ? {
                  opening_count: { amount: values.openingCount, currency: values.currency },
                  opening_count_confirmation: {
                    amount: values.openingCountAgain,
                    currency: values.currency,
                  },
                }
              : {};
          add.mutate(
            {
              ...path,
              body: {
                name: values.name,
                kind: values.kind,
                currency: values.currency,
                start_date: values.startDate,
                ...counts,
              },
            },
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
                onValueChange={(next: Kind) => {
                  field.onChange(next);
                  if (!startDateEdited) {
                    form.setValue("startDate", defaultStartDate(next));
                  }
                }}
                className="grid-cols-2"
              >
                {kinds.map((option) => (
                  <Label
                    key={option}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3"
                  >
                    <RadioGroupItem value={option} />
                    {tCommon(kindKeys[option])}
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
                onValueChange={(next) => {
                  field.onChange(next);
                  // A count typed in one currency isn't one in another.
                  form.setValue("openingCount", null);
                  form.setValue("openingCountAgain", null);
                }}
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
              <FieldDescription id={`${currencyId}-help`}>
                {cash ? t("add.currencyHelpCash") : t("add.currencyHelp")}
              </FieldDescription>
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
                  setStartDateEdited(true);
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
              <FieldDescription id={`${startId}-help`}>
                {cash ? t("add.startDateHelpCash") : t("add.startDateHelp")}
              </FieldDescription>
              {errors.startDate?.message !== undefined && (
                <FieldError id={`${startId}-error`}>{errors.startDate.message}</FieldError>
              )}
            </Field>
          )}
        />
        {cash && (
          <>
            <Controller
              control={form.control}
              name="openingCount"
              render={({ field }) => (
                <AmountInput
                  // A new currency starts the text over.
                  key={currency}
                  label={t("add.openingCount")}
                  currency={currency}
                  decimalPlaces={decimalPlaces}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  required
                  description={t("add.openingCountHelp")}
                  {...(errors.openingCount?.message === undefined
                    ? {}
                    : { error: errors.openingCount.message })}
                />
              )}
            />
            <Controller
              control={form.control}
              name="openingCountAgain"
              render={({ field }) => (
                <AmountInput
                  key={currency}
                  label={t("add.openingCountAgain")}
                  currency={currency}
                  decimalPlaces={decimalPlaces}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  required
                  {...(errors.openingCountAgain?.message === undefined
                    ? {}
                    : { error: errors.openingCountAgain.message })}
                />
              )}
            />
          </>
        )}
        <Button type="submit" disabled={add.isPending}>
          {add.isPending ? t("add.adding") : t("add.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
