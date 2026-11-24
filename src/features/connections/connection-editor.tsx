import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { InfoIcon } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type FieldError as FormFieldError } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import type { Connection } from "../../components/connection-names";
import { FormAlert } from "../../components/form-alert";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { NativeSelect, NativeSelectOption } from "../../components/ui/native-select";
import {
  columnsFor,
  csvMapping,
  freeConnectionName,
  headerKey,
  mappingForm,
  mappingSchema,
  newMappingForm,
  parseColumnKey,
  pickColumn,
  positionKey,
  rekeyColumns,
  requiredColumns,
  sameMapping,
  type Choice,
  type ColumnField,
  type ColumnKey,
  type MappingForm,
} from "../../lib/csv-mapping";
import {
  firstReadRow,
  guessSample,
  sampleTable,
  type SampleTable as Table,
} from "../../lib/csv-sample";
import type { EditorFrom } from "../../lib/search";
import { choiceValues, useChoiceLabel } from "./choice-labels";
import { useSaveConnection, useTestMapping, type CsvMappingTest } from "./connection-query";
import { MappingTest } from "./mapping-test";
import { SampleTable } from "./sample-table";

/** The editor's fields that make the mapping, as opposed to the name. */
const mappingFields = [
  "encoding",
  "delimiter",
  "hasHeaderRow",
  "skipLeadingLines",
  "skipTrailingLines",
  "dateFormat",
  "decimalSeparator",
  "thousandsSeparator",
  "amountLayout",
  "positiveAmountMeans",
  "columns",
] as const;

interface Sample {
  file: File;
  bytes: Uint8Array;
  /** No column read as dates in a format the editor offers. */
  noDates: boolean;
}

/**
 * The CSV mapping editor (spec, "CSV mapping editor"): one page that creates a
 * Connection with its mapping, or renames an existing one and changes its
 * mapping. A sample file, read only in the browser, prefills the guesses and
 * lets the User pick columns from a table; "How rows will read" asks the
 * backend. Save returns where the User came from; leaving with unsaved
 * changes asks first.
 */
export function ConnectionEditor({
  householdId,
  accountId,
  connectionId,
  from,
}: {
  householdId: string;
  accountId: string;
  /** Undefined for a new Connection. */
  connectionId: string | undefined;
  from: EditorFrom | undefined;
}) {
  const { t } = useTranslation("connections");
  const { api } = useApi();
  const navigate = useNavigate();
  const choiceLabel = useChoiceLabel();
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;
  const params = { householdId, accountId };

  // The route's loader has fetched them.
  const { data: connectionList } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/connections",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  const existing = connectionList.items.find(
    (connection) => connection.connection_id === connectionId,
  );

  const fieldLabel = (field: ColumnField) => t(`fields.${field}`);
  const schema = mappingSchema(
    (key) => t(key),
    (other) => t("rules.columnUsedTwice", { field: fieldLabel(other) }),
  );
  const [defaults] = useState<MappingForm>(() =>
    existing === undefined
      ? newMappingForm(
          freeConnectionName(
            t("editor.defaultName"),
            connectionList.items.map(({ name }) => name),
          ),
        )
      : mappingForm(existing.name, existing.csv_mapping),
  );
  const form = useForm<MappingForm>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors, isDirty, isSubmitted } = form.formState;
  useWatch({ control: form.control });
  const values = form.getValues();

  const [sample, setSample] = useState<Sample>();
  const table: Table | undefined =
    sample === undefined
      ? undefined
      : sampleTable(sample.bytes, {
          encoding: values.encoding,
          delimiter: values.delimiter,
          skipLeadingLines: Number(values.skipLeadingLines) || 0,
          skipTrailingLines: Number(values.skipTrailingLines) || 0,
          hasHeaderRow: values.hasHeaderRow,
        });
  const fields = columnsFor(values.amountLayout);
  const required = requiredColumns(values.amountLayout);

  // The column at `index` of the sample, by header when the file has a header row.
  const keyOf = (index: number): ColumnKey => {
    const header = table?.header?.[index]?.trim() ?? "";
    return header === "" ? positionKey(index + 1) : headerKey(header);
  };

  const testing = useTestMapping(householdId, accountId);
  const [tested, setTested] = useState<{ result: CsvMappingTest; mapping: string }>();
  const save = useSaveConnection(householdId, accountId, existing);

  // Save leaves the page on purpose; anything else with unsaved changes asks first.
  const leaving = useRef(false);
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !leaving.current,
    enableBeforeUnload: () => isDirty && !leaving.current,
    withResolver: true,
  });

  const goBack = async (saved?: Connection) => {
    if (from === "statement-import") {
      const id = saved?.connection_id ?? existing?.connection_id;
      await navigate({
        to: "/households/$householdId/accounts/$accountId/statement-imports/new",
        params,
        search: id === undefined ? {} : { connection_id: id },
      });
    } else if (from === "getting-started") {
      await navigate({ to: "/households/$householdId/accounts/$accountId", params });
    } else {
      await navigate({ to: "/households/$householdId/accounts/$accountId/connections", params });
    }
  };

  const openSample = async (file: File | undefined) => {
    if (file === undefined) {
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const skip = Number(form.getValues("skipLeadingLines")) || 0;
    const skipTrailingLines = Number(form.getValues("skipTrailingLines")) || 0;
    const guess = guessSample(bytes, skip);
    const set = { shouldDirty: true, shouldValidate: isSubmitted };
    form.setValue("encoding", guess.encoding, set);
    form.setValue("delimiter", guess.delimiter, set);
    form.setValue("hasHeaderRow", guess.hasHeaderRow, set);
    if (guess.dateFormat !== undefined) {
      form.setValue("dateFormat", guess.dateFormat, set);
    }
    form.setValue("decimalSeparator", guess.decimalSeparator, set);
    if (form.getValues("thousandsSeparator") === guess.decimalSeparator) {
      form.setValue("thousandsSeparator", "", set);
    }
    const { firstRow } = sampleTable(bytes, {
      ...guess,
      skipLeadingLines: skip,
      skipTrailingLines,
    });
    form.setValue(
      "columns",
      rekeyColumns(form.getValues("columns"), firstRow, guess.hasHeaderRow),
      set,
    );
    setSample({ file, bytes, noDates: guess.dateFormat === undefined });
    setTested(undefined);
    testing.reset();
  };

  const pick = (index: number, field: ColumnField | undefined) => {
    form.setValue("columns", pickColumn(form.getValues("columns"), keyOf(index), field), {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
  };

  const runTest = async () => {
    if (sample === undefined || !(await form.trigger(mappingFields))) {
      return;
    }
    const mapping = csvMapping(form.getValues());
    testing.mutate(
      { mapping, file: sample.file },
      {
        onSuccess: (result) => {
          setTested({ result, mapping: JSON.stringify(mapping) });
        },
      },
    );
  };

  const describedBy = (name: string, error: FormFieldError | undefined, help?: boolean) =>
    [
      help === true ? `${fieldId(name)}-help` : undefined,
      error ? `${fieldId(name)}-error` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const errorText = (name: string, error: FormFieldError | undefined) =>
    error?.message === undefined ? null : (
      <FieldError id={`${fieldId(name)}-error`}>{error.message}</FieldError>
    );

  const choiceSelect = (
    name: Exclude<
      (typeof mappingFields)[number],
      "hasHeaderRow" | "columns" | "skipLeadingLines" | "skipTrailingLines"
    >,
    choice: Choice,
    label: string,
    placeholder?: string,
  ) => {
    const error = errors[name];
    return (
      <Field data-invalid={error !== undefined}>
        <FieldLabel htmlFor={fieldId(name)}>{label}</FieldLabel>
        <NativeSelect
          id={fieldId(name)}
          className="w-full text-foreground"
          aria-invalid={error !== undefined}
          aria-describedby={describedBy(name, error)}
          {...form.register(name)}
        >
          {placeholder !== undefined && (
            <NativeSelectOption value="">{placeholder}</NativeSelectOption>
          )}
          {choiceValues(choice, values[name]).map((value) => (
            <NativeSelectOption key={value} value={value}>
              {choiceLabel(choice, value)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errorText(name, error)}
      </Field>
    );
  };

  const options = columnOptions(table, values.hasHeaderRow, keyOf, values.columns, t);

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {existing === undefined
            ? t("editor.titleNew")
            : t("editor.titleEdit", { name: existing.name })}
        </h2>
        <p className="text-sm text-muted-foreground">{t("editor.description")}</p>
      </div>
      <form
        noValidate
        className="grid gap-6"
        onSubmit={(event) => {
          void form.handleSubmit((typed) => {
            const changed = existing?.csv_mapping === undefined || !sameMapping(typed, defaults);
            save.mutate(
              { name: typed.name, mapping: changed ? csvMapping(typed) : undefined },
              {
                onSuccess: (saved) => {
                  leaving.current = true;
                  void goBack(saved);
                },
              },
            );
          })(event);
        }}
      >
        <Card>
          <CardContent>
            <Field data-invalid={errors.name !== undefined}>
              <FieldLabel htmlFor={fieldId("name")}>{t("editor.name")}</FieldLabel>
              <Input
                id={fieldId("name")}
                autoComplete="off"
                aria-invalid={errors.name !== undefined}
                aria-describedby={describedBy("name", errors.name)}
                {...form.register("name")}
              />
              {errorText("name", errors.name)}
            </Field>
          </CardContent>
        </Card>

        <Section title={t("sample.title")} description={t("sample.description")}>
          <Field>
            <FieldLabel htmlFor={fieldId("sample")}>
              {sample === undefined ? t("sample.choose") : t("sample.replace")}
            </FieldLabel>
            <Input
              id={fieldId("sample")}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={(event) => {
                void openSample(event.target.files?.[0]);
              }}
            />
          </Field>
          <div aria-live="polite">
            {sample !== undefined && (
              <p className="text-sm text-muted-foreground">
                {sample.noDates
                  ? t("sample.noDates", { name: sample.file.name })
                  : t("sample.guessed", { name: sample.file.name })}
              </p>
            )}
          </div>
          {sample !== undefined && table !== undefined && (
            <SampleTable
              fileName={sample.file.name}
              table={table}
              fields={fields}
              picks={values.columns}
              keyOf={keyOf}
              onPick={pick}
            />
          )}
        </Section>

        <Section title={t("file.title")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {choiceSelect("encoding", "encoding", t("file.encoding"))}
            {choiceSelect("delimiter", "delimiter", t("file.delimiter"))}
          </div>
          <Controller
            control={form.control}
            name="hasHeaderRow"
            render={({ field }) => (
              <Label className="flex min-h-6 cursor-pointer items-center gap-3 font-normal">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked: boolean) => {
                    field.onChange(checked);
                    if (table !== undefined) {
                      form.setValue(
                        "columns",
                        rekeyColumns(form.getValues("columns"), table.firstRow, checked),
                        { shouldDirty: true, shouldValidate: isSubmitted },
                      );
                    }
                  }}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
                {t("file.headerRow")}
              </Label>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={errors.skipLeadingLines !== undefined}>
              <FieldLabel htmlFor={fieldId("skipTop")}>{t("file.skipLeadingLines")}</FieldLabel>
              <Input
                id={fieldId("skipTop")}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={errors.skipLeadingLines !== undefined}
                aria-describedby={describedBy("skipTop", errors.skipLeadingLines, true)}
                {...form.register("skipLeadingLines")}
              />
              <FieldDescription id={`${fieldId("skipTop")}-help`}>
                {t("file.skipLeadingLinesHelp")}
              </FieldDescription>
              {errorText("skipTop", errors.skipLeadingLines)}
            </Field>
            <Field data-invalid={errors.skipTrailingLines !== undefined}>
              <FieldLabel htmlFor={fieldId("skipBottom")}>{t("file.skipTrailingLines")}</FieldLabel>
              <Input
                id={fieldId("skipBottom")}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={errors.skipTrailingLines !== undefined}
                aria-describedby={describedBy("skipBottom", errors.skipTrailingLines, true)}
                {...form.register("skipTrailingLines")}
              />
              <FieldDescription id={`${fieldId("skipBottom")}-help`}>
                {t("file.skipTrailingLinesHelp")}
              </FieldDescription>
              {errorText("skipBottom", errors.skipTrailingLines)}
            </Field>
          </div>
        </Section>

        <Section title={t("numbers.title")}>
          <div className="grid gap-4 sm:grid-cols-3">
            {choiceSelect(
              "dateFormat",
              "date_format",
              t("numbers.dateFormat"),
              t("numbers.chooseDateFormat"),
            )}
            {choiceSelect("decimalSeparator", "decimal_separator", t("numbers.decimalSeparator"))}
            {choiceSelect(
              "thousandsSeparator",
              "thousands_separator",
              t("numbers.thousandsSeparator"),
            )}
          </div>
        </Section>

        <Section title={t("amounts.title")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {choiceSelect("amountLayout", "amount_layout", t("amounts.layout"))}
            {values.amountLayout !== "DEBIT_CREDIT" &&
              choiceSelect("positiveAmountMeans", "positive_amount_means", t("amounts.positive"))}
          </div>
        </Section>

        <Section title={t("columns.title")} description={t("columns.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const error = errors.columns?.[field];
              const name = `column-${field}`;
              const isRequired = required.includes(field);
              return (
                <Field key={field} data-invalid={error !== undefined}>
                  <FieldLabel htmlFor={fieldId(name)}>
                    {isRequired
                      ? fieldLabel(field)
                      : t("columns.optional", { field: fieldLabel(field) })}
                  </FieldLabel>
                  <NativeSelect
                    id={fieldId(name)}
                    className="w-full text-foreground"
                    aria-invalid={error !== undefined}
                    aria-describedby={describedBy(name, error)}
                    {...form.register(`columns.${field}`)}
                  >
                    <NativeSelectOption value="">
                      {isRequired ? t("columns.choose") : t("columns.notInFile")}
                    </NativeSelectOption>
                    {options.map((option) => (
                      <NativeSelectOption key={option.key} value={option.key}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {errorText(name, error)}
                </Field>
              );
            })}
          </div>
        </Section>

        <Section title={t("test.title")} description={t("test.description")}>
          <MappingTest
            hasSample={sample !== undefined}
            result={tested?.result}
            stale={tested !== undefined && tested.mapping !== JSON.stringify(csvMapping(values))}
            pending={testing.isPending}
            error={testing.error}
            onRun={() => void runTest()}
          />
        </Section>

        <div className="grid gap-4">
          {existing !== undefined && (
            <FutureImportsNote
              householdId={householdId}
              accountId={accountId}
              connectionId={existing.connection_id}
            />
          )}
          {save.isError && <FormAlert error={save.error} />}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t("editor.saving") : t("editor.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void goBack()}>
              {t("editor.cancel")}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.status === "blocked") {
            blocker.reset();
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("leave.title")}</DialogTitle>
            <DialogDescription>{t("leave.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              {t("leave.stay")}
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              {t("leave.leave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend>{title}</FieldLegend>
          {description !== undefined && <FieldDescription>{description}</FieldDescription>}
          <FieldGroup className="gap-4">{children}</FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  );
}

/**
 * What a column field offers: the sample's columns, or without a sample the
 * columns the mapping names plus the first positions; and whatever is picked
 * now, so a saved pick always shows.
 */
function columnOptions(
  table: Table | undefined,
  hasHeaderRow: boolean,
  keyOf: (index: number) => ColumnKey,
  picks: Record<ColumnField, ColumnKey>,
  t: ReturnType<typeof useTranslation<"connections">>["t"],
): { key: ColumnKey; label: string }[] {
  const options = new Map<ColumnKey, string>();
  const labelOf = (key: ColumnKey) => {
    const column = parseColumnKey(key);
    if (column === undefined) {
      return key;
    }
    return "header" in column ? column.header : t("columns.position", { number: column.position });
  };
  if (table === undefined) {
    const picked = Object.values(picks).filter((key) => key !== "");
    for (const key of picked.filter((key) => key.startsWith("h:"))) {
      options.set(key, labelOf(key));
    }
    const positions = picked
      .map((key) => parseColumnKey(key))
      .flatMap((column) => (column !== undefined && "position" in column ? [column.position] : []));
    const last = Math.max(12, ...positions);
    for (let number = 1; number <= last; number += 1) {
      options.set(positionKey(number), labelOf(positionKey(number)));
    }
  } else {
    for (let index = 0; index < table.width; index += 1) {
      const key = keyOf(index);
      const number = index + 1;
      const value = firstReadRow(table)?.cells[index]?.trim() ?? "";
      options.set(
        key,
        key.startsWith("h:") && hasHeaderRow
          ? t("sample.columnWithHeader", { number, header: key.slice(2) })
          : value === ""
            ? t("columns.position", { number })
            : t("columns.positionWithValue", { number, value }),
      );
    }
  }
  for (const key of Object.values(picks)) {
    if (key !== "" && !options.has(key)) {
      options.set(key, labelOf(key));
    }
  }
  return [...options].map(([key, label]) => ({ key, label }));
}

/** Above Save when the Connection has Statement imports: saving changes future imports only. */
function FutureImportsNote({
  householdId,
  accountId,
  connectionId,
}: {
  householdId: string;
  accountId: string;
  connectionId: string;
}) {
  const { t } = useTranslation("connections");
  const { api } = useApi();
  // The route's loader has fetched it.
  const { data: imports } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/connections/{connection_id}/statement-imports",
    { params: { path: { household_id: householdId, connection_id: connectionId } } },
  );
  if (imports.items.length === 0) {
    return null;
  }
  return (
    <Alert>
      <InfoIcon aria-hidden="true" />
      <AlertDescription className="grid gap-1">
        <p>{t("editor.futureOnly")}</p>
        <Link
          to="/households/$householdId/accounts/$accountId/statement-imports"
          params={{ householdId, accountId }}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {t("editor.statementImports")}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
