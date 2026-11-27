import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { AmountInput } from "../../components/amount-input";
import { CategoryPicker, counterpartOf } from "../../components/category-picker";
import { DateInput } from "../../components/date-input";
import { FormAlert } from "../../components/form-alert";
import {
  RecordContext,
  type OpenRecord,
  type RecordPrefill,
} from "../../components/record-transaction";
import { useInfoToast } from "../../components/toaster";
import { Button } from "../../components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { isCash, refetchAccountReads, useRefetchAccountReads } from "../../lib/account-query";
import { cashDateRange } from "../../lib/cash-dates";
import { fitsSign, flattenCategories, signOf } from "../../lib/categories";
import { formatDate, formatDateLong, type IsoDate } from "../../lib/date";
import { formatDecimal, formatMoney, type Decimal } from "../../lib/money";
import { formatMonth, type Month } from "../../lib/month";
import { transactionsKey } from "./transactions-query";

type Account = components["schemas"]["Account"];

/**
 * Record a Transaction (cash-accounts-and-transfers spec, "Record a
 * Transaction"): a side sheet, full-screen on mobile, that any screen of a
 * cash Account's area opens with `useRecordTransaction`. Around a statement
 * Account it provides nothing, so those screens offer no recording.
 */
export function RecordTransactionProvider({
  householdId,
  accountId,
  children,
}: {
  householdId: string;
  accountId: string;
  children: ReactNode;
}) {
  const { api } = useApi();
  // The route's loader has fetched it already.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  return isCash(account) ? (
    <CashRecording householdId={householdId} account={account}>
      {children}
    </CashRecording>
  ) : (
    children
  );
}

function CashRecording({
  householdId,
  account,
  children,
}: {
  householdId: string;
  account: Account;
  children: ReactNode;
}) {
  const { t } = useTranslation("transactions");
  const [open, setOpen] = useState(false);
  // Each opening starts a new form, with its own prefill.
  const [opening, setOpening] = useState<{ count: number; prefill: RecordPrefill }>({
    count: 0,
    prefill: {},
  });
  const openRecord = useMemo<OpenRecord>(
    () => (prefill) => {
      setOpening(({ count }) => ({ count: count + 1, prefill: prefill ?? {} }));
      setOpen(true);
    },
    [],
  );

  return (
    <RecordContext.Provider value={openRecord}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          <SheetHeader className="pr-12">
            <SheetTitle>{t("record.title")}</SheetTitle>
            <SheetDescription>
              {t("record.description", { account: account.name, currency: account.currency })}
            </SheetDescription>
          </SheetHeader>
          {open && (
            <RecordForm
              key={opening.count}
              householdId={householdId}
              account={account}
              prefill={opening.prefill}
              onClose={() => {
                setOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </RecordContext.Provider>
  );
}

function RecordForm({
  householdId,
  account,
  prefill,
  onClose,
}: {
  householdId: string;
  account: Account;
  prefill: RecordPrefill;
  onClose: () => void;
}) {
  const { t } = useTranslation("transactions");
  const { api } = useApi();
  const queryClient = useQueryClient();
  const toast = useInfoToast();
  const refetchAccount = useRefetchAccountReads(householdId, account.account_id);
  const otherSideId = useId();
  const dateId = useId();
  const descriptionId = useId();
  const payeeId = useId();
  const amountRef = useRef<HTMLInputElement>(null);

  const currencies = api.useQuery("get", "/currencies");
  const decimalPlaces =
    currencies.data?.items.find(({ code }) => code === account.currency)?.decimal_places ?? 2;
  const categories = api.useQuery("get", "/households/{household_id}/categories", {
    params: { path: { household_id: householdId } },
  });
  const flat = useMemo(() => flattenCategories(categories.data?.items ?? []), [categories.data]);
  const accounts = api.useQuery("get", "/households/{household_id}/accounts", {
    params: { path: { household_id: householdId } },
  });
  // A Transfer's Counterpart: any other Household Account in the same currency.
  const counterparts = useMemo(
    () =>
      (accounts.data?.items ?? []).filter(
        (other) => other.account_id !== account.account_id && other.currency === account.currency,
      ),
    [accounts.data, account.account_id, account.currency],
  );
  const record = api.useMutation(
    "post",
    "/households/{household_id}/accounts/{account_id}/transactions",
  );
  const range = cashDateRange(account);
  // The Category a sign change cleared, named until another is picked.
  const [cleared, setCleared] = useState<{ name: string; kind: string }>();

  const schema = z.object({
    amount: z.custom<Decimal | null>().superRefine((amount, context) => {
      if (amount === null) {
        context.addIssue({ code: "custom", message: t("record.amountRequired") });
      } else if (signOf(amount) === undefined) {
        context.addIssue({ code: "custom", message: t("record.amountZero") });
      }
    }),
    otherSide: z.string().nullable(),
    date: z
      .string()
      .min(1, t("record.dateInvalid", { example: formatDate(range.initial) }))
      .refine(
        (date) => date >= range.min,
        range.minReason === "start-date"
          ? t("record.dateBeforeStart", { date: formatDateLong(range.min) })
          : t("record.dateInClosedMonth", {
              month: formatMonth(account.open_month as Month),
              date: formatDateLong(range.min),
            }),
      )
      .refine((date) => date <= range.max, t("record.dateTooLate")),
    description: z
      .string()
      .trim()
      .min(1, t("record.descriptionRequired"))
      .max(500, t("record.descriptionTooLong")),
    payee: z.string().trim().max(200, t("record.payeeTooLong")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: prefill.amount ?? null,
      otherSide: null as string | null,
      date: prefill.date ?? range.initial,
      description: prefill.description ?? "",
      payee: "",
    },
  });
  const { errors } = form.formState;
  const amount = useWatch({ control: form.control, name: "amount" });
  const sign = amount === null ? undefined : signOf(amount);
  const otherSide = useWatch({ control: form.control, name: "otherSide" });
  const counterpart = counterparts.find(
    ({ account_id }) => account_id === counterpartOf(otherSide),
  );

  const describedBy = (id: string, error: string | undefined, help?: string) =>
    [help, error === undefined ? undefined : `${id}-error`].filter(Boolean).join(" ") || undefined;

  /** A new sign the chosen Category doesn't fit clears it, with a message. */
  const onAmountChange = (next: Decimal | null) => {
    form.setValue("amount", next, { shouldValidate: form.formState.isSubmitted });
    // A Transfer fits both signs, so only a Category can be cleared.
    const chosen = flat.find(({ id }) => id === form.getValues("otherSide"));
    if (chosen !== undefined && !fitsSign(chosen, next === null ? undefined : signOf(next))) {
      form.setValue("otherSide", null);
      setCleared({ name: chosen.path.join(" › "), kind: chosen.kind });
    }
  };

  return (
    <form
      noValidate
      className="px-4 pb-4"
      onSubmit={(event) => {
        // Enter submits with the first button, Save and add another.
        const closing = event.nativeEvent.submitter?.getAttribute("value") === "close";
        void form.handleSubmit((values) => {
          if (values.amount === null) {
            return;
          }
          const counterpartId = counterpartOf(values.otherSide);
          // A cash ↔ cash Transfer records the Counterpart's leg too.
          const counterpartIsCash = counterparts.some(
            (other) => other.account_id === counterpartId && isCash(other),
          );
          record.mutate(
            {
              params: {
                path: { household_id: householdId, account_id: account.account_id },
              },
              body: {
                date: values.date,
                amount: { amount: values.amount, currency: account.currency },
                description: values.description,
                ...(values.payee === "" ? {} : { payee: values.payee }),
                ...(values.otherSide === null
                  ? {}
                  : counterpartId === undefined
                    ? { category_id: values.otherSide }
                    : { counterpart_account_id: counterpartId }),
              },
            },
            {
              onSuccess: (transaction) => {
                prefill.onRecorded?.();
                toast(
                  t("record.saved", {
                    description: transaction.description,
                    amount: formatMoney(transaction.amount),
                  }),
                );
                void Promise.all([
                  queryClient.invalidateQueries({
                    queryKey: transactionsKey(householdId, account.account_id),
                  }),
                  refetchAccount(),
                  ...(counterpartId !== undefined && counterpartIsCash
                    ? [
                        queryClient.invalidateQueries({
                          queryKey: transactionsKey(householdId, counterpartId),
                        }),
                        refetchAccountReads(queryClient, householdId, counterpartId),
                      ]
                    : []),
                ]);
                if (closing) {
                  onClose();
                  return;
                }
                form.reset({
                  amount: null,
                  otherSide: null,
                  date: values.date,
                  description: "",
                  payee: "",
                });
                setCleared(undefined);
                amountRef.current?.focus();
              },
            },
          );
        })(event);
      }}
    >
      <FieldGroup>
        {record.isError && <FormAlert error={record.error} />}
        {currencies.isError && <FormAlert error={currencies.error} />}
        {categories.isError && <FormAlert error={categories.error} />}
        {accounts.isError && <FormAlert error={accounts.error} />}
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <AmountInput
              label={t("record.amount")}
              currency={account.currency}
              decimalPlaces={decimalPlaces}
              value={field.value}
              onValueChange={onAmountChange}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={amountRef}
              required
              description={t("record.amountHelp", { example: formatDecimal("-2.50") })}
              {...(errors.amount?.message === undefined ? {} : { error: errors.amount.message })}
            />
          )}
        />
        <Controller
          control={form.control}
          name="otherSide"
          render={({ field }) => (
            <Field>
              <FieldLabel id={`${otherSideId}-label`} htmlFor={otherSideId}>
                {t("record.otherSide")}
              </FieldLabel>
              <CategoryPicker
                id={otherSideId}
                label={{ id: `${otherSideId}-label` }}
                categories={categories.data?.items ?? []}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setCleared(undefined);
                }}
                sign={sign}
                transfers={counterparts}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
                aria-describedby={[
                  `${otherSideId}-help`,
                  `${otherSideId}-cleared`,
                  ...(counterpart === undefined || isCash(counterpart)
                    ? []
                    : [`${otherSideId}-in-transit`]),
                ].join(" ")}
              />
              <FieldDescription id={`${otherSideId}-help`}>
                {t("record.otherSideHelp")}
              </FieldDescription>
              {counterpart !== undefined && !isCash(counterpart) && (
                // A leg to a statement Account waits for its statement row.
                <FieldDescription id={`${otherSideId}-in-transit`}>
                  {t("record.inTransitNote", { account: counterpart.name })}
                </FieldDescription>
              )}
              <p
                id={`${otherSideId}-cleared`}
                aria-live="polite"
                className="text-sm text-muted-foreground empty:hidden"
              >
                {cleared === undefined
                  ? ""
                  : t(
                      cleared.kind === "INCOME" ? "record.clearedIncome" : "record.clearedExpense",
                      {
                        category: cleared.name,
                      },
                    )}
              </p>
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="date"
          render={({ field }) => (
            <Field data-invalid={errors.date !== undefined}>
              <FieldLabel htmlFor={dateId}>{t("record.date")}</FieldLabel>
              <DateInput
                id={dateId}
                value={field.value === "" ? null : (field.value as IsoDate)}
                onValueChange={(date) => {
                  field.onChange(date ?? "");
                }}
                onBlur={field.onBlur}
                name={field.name}
                inputRef={field.ref}
                min={range.min}
                max={range.max}
                aria-invalid={errors.date !== undefined}
                aria-describedby={describedBy(dateId, errors.date?.message)}
              />
              {errors.date?.message !== undefined && (
                <FieldError id={`${dateId}-error`}>{errors.date.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Field data-invalid={errors.description !== undefined}>
          <FieldLabel htmlFor={descriptionId}>{t("record.descriptionField")}</FieldLabel>
          <Input
            id={descriptionId}
            autoComplete="off"
            required
            aria-invalid={errors.description !== undefined}
            aria-describedby={describedBy(descriptionId, errors.description?.message)}
            {...form.register("description")}
          />
          {errors.description?.message !== undefined && (
            <FieldError id={`${descriptionId}-error`}>{errors.description.message}</FieldError>
          )}
        </Field>
        <Field data-invalid={errors.payee !== undefined}>
          <FieldLabel htmlFor={payeeId}>{t("record.payee")}</FieldLabel>
          <Input
            id={payeeId}
            autoComplete="off"
            aria-invalid={errors.payee !== undefined}
            aria-describedby={describedBy(payeeId, errors.payee?.message, `${payeeId}-help`)}
            {...form.register("payee")}
          />
          <FieldDescription id={`${payeeId}-help`}>{t("record.payeeHelp")}</FieldDescription>
          {errors.payee?.message !== undefined && (
            <FieldError id={`${payeeId}-error`}>{errors.payee.message}</FieldError>
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" value="another" disabled={record.isPending}>
            {t("record.saveAndAddAnother")}
          </Button>
          <Button type="submit" value="close" variant="outline" disabled={record.isPending}>
            {t("record.save")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
