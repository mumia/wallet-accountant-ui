import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../api/context";
import { currencyName } from "../lib/currency";
import { FormAlert } from "./form-alert";
import { Button } from "./ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./ui/combobox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

interface CurrencyOption {
  code: string;
  /** "EUR — Euro", or just the code when Intl has no name for it. */
  label: string;
}

/**
 * A new Household's name and Base currency (spec, "First run"): the currency has
 * no default and is chosen from `GET /currencies`. On success it opens the new
 * Household. Used on `/households/new` and in the switcher's Create Household
 * dialog.
 */
export function HouseholdForm({ onCreated }: { onCreated?: () => void }) {
  const { t } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nameId = useId();
  const currencyId = useId();

  const currencies = api.useQuery("get", "/currencies");
  const options = useMemo(
    () =>
      (currencies.data?.items ?? []).map(({ code }): CurrencyOption => {
        const name = currencyName(code);
        return { code, label: name === undefined ? code : t("currencyLabel", { code, name }) };
      }),
    [currencies.data, t],
  );

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("householdForm.nameRequired"))
      .max(200, t("householdForm.nameTooLong")),
    baseCurrency: z.string().min(1, t("householdForm.baseCurrencyRequired")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", baseCurrency: "" },
  });
  const create = api.useMutation("post", "/households");

  const openHousehold = async (householdId: string) => {
    onCreated?.();
    await queryClient.invalidateQueries({ queryKey: ["get", "/households"] });
    await navigate({ to: "/households/$householdId", params: { householdId } });
  };

  const nameError = form.formState.errors.name?.message;
  const currencyError = form.formState.errors.baseCurrency?.message;
  const describedBy = (id: string, error: string | undefined, help?: string) =>
    [help, error === undefined ? undefined : `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(({ name, baseCurrency }) => {
          create.mutate(
            { body: { name, base_currency: baseCurrency } },
            {
              onSuccess: (household) => void openHousehold(household.household_id),
            },
          );
        })(event);
      }}
    >
      <FieldGroup>
        {create.isError && <FormAlert error={create.error} />}
        {currencies.isError && (
          <div className="grid justify-items-start gap-2">
            <FormAlert error={currencies.error} />
            <Button variant="outline" onClick={() => void currencies.refetch()}>
              {t("errors.tryAgain")}
            </Button>
          </div>
        )}
        <Field data-invalid={nameError !== undefined}>
          <FieldLabel htmlFor={nameId}>{t("householdForm.name")}</FieldLabel>
          <Input
            id={nameId}
            autoComplete="off"
            placeholder={t("householdForm.namePlaceholder")}
            aria-invalid={nameError !== undefined}
            aria-describedby={describedBy(nameId, nameError)}
            {...form.register("name")}
          />
          {nameError !== undefined && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
        </Field>
        <Controller
          control={form.control}
          name="baseCurrency"
          render={({ field }) => (
            <Field data-invalid={currencyError !== undefined}>
              <FieldLabel htmlFor={currencyId}>{t("householdForm.baseCurrency")}</FieldLabel>
              <Combobox
                disabled={!currencies.isSuccess}
                items={options}
                value={options.find(({ code }) => code === field.value) ?? null}
                onValueChange={(option: CurrencyOption | null) => {
                  field.onChange(option?.code ?? "");
                }}
                itemToStringLabel={(option: CurrencyOption) => option.label}
                isItemEqualToValue={(a: CurrencyOption, b: CurrencyOption) => a.code === b.code}
              >
                <ComboboxInput
                  id={currencyId}
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  placeholder={t("householdForm.baseCurrencyPlaceholder")}
                  aria-invalid={currencyError !== undefined}
                  aria-describedby={describedBy(currencyId, currencyError, `${currencyId}-help`)}
                />
                <ComboboxContent>
                  <ComboboxEmpty>{t("householdForm.noCurrency")}</ComboboxEmpty>
                  <ComboboxList>
                    {(option: CurrencyOption) => (
                      <ComboboxItem key={option.code} value={option}>
                        {option.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldDescription id={`${currencyId}-help`}>
                {t("householdForm.baseCurrencyHelp")}
              </FieldDescription>
              {currencyError !== undefined && (
                <FieldError id={`${currencyId}-error`}>{currencyError}</FieldError>
              )}
            </Field>
          )}
        />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? t("householdForm.creating") : t("householdForm.create")}
        </Button>
      </FieldGroup>
    </form>
  );
}
