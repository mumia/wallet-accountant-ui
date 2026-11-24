import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AmountInput } from "../../components/amount-input";
import type { NamedConnection } from "../../components/connection-names";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Field, FieldError, FieldGroup } from "../../components/ui/field";
import { hasBalanceColumn } from "../../lib/csv-mapping";
import type { Decimal } from "../../lib/money";
import { Refusal } from "./refusal";
import type { StatementInput } from "./statement-import-query";

/** A hint for the file chooser only: any file can be picked. */
const accept = ".csv,.txt,text/csv,text/plain";

function formatFileSize(bytes: number): string {
  const [value, unit] =
    bytes < 1024
      ? [bytes, "byte"]
      : bytes < 1024 * 1024
        ? [bytes / 1024, "kilobyte"]
        : [bytes / (1024 * 1024), "megabyte"];
  return new Intl.NumberFormat(undefined, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: unit === "byte" ? 0 : 1,
  }).format(value);
}

/**
 * Files dropped on `zone`, for mouse users: the file input beside it is the way
 * for everyone else. Says whether a file is being dragged over it.
 */
function useFileDrop(
  zone: RefObject<HTMLElement | null>,
  onFile: (file: File | undefined) => void,
): boolean {
  const [dragging, setDragging] = useState(false);
  const latest = useRef(onFile);
  useEffect(() => {
    latest.current = onFile;
  });
  useEffect(() => {
    const element = zone.current;
    if (element === null) {
      return undefined;
    }
    const over = (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    };
    const leave = () => {
      setDragging(false);
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      latest.current(event.dataTransfer?.files[0]);
    };
    element.addEventListener("dragover", over);
    element.addEventListener("dragleave", leave);
    element.addEventListener("drop", drop);
    return () => {
      element.removeEventListener("dragover", over);
      element.removeEventListener("dragleave", leave);
      element.removeEventListener("drop", drop);
    };
  }, [zone]);
  return dragging;
}

/**
 * Step 2: the statement file and its Export balance. On a first import the
 * Export balance is typed twice, and pasting into the second field is refused;
 * a mismatch shows when the field is left or on Preview, never while typing.
 * Through a mapping with a balance column it is typed once: the backend checks
 * it against the file's balance, which the page never shows.
 */
export function FileStep({
  householdId,
  accountId,
  connection,
  canChangeConnection,
  currency,
  decimalPlaces,
  first,
  initial,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  householdId: string;
  accountId: string;
  connection: NamedConnection;
  /** The Connection came from `?connection_id=`: show its name with "Change". */
  canChangeConnection: boolean;
  currency: string;
  decimalPlaces: number;
  first: boolean;
  /** What was typed before, when the User came Back. */
  initial: StatementInput | undefined;
  pending: boolean;
  error: unknown;
  onBack: (() => void) | undefined;
  onSubmit: (input: StatementInput) => void;
}) {
  const { t } = useTranslation("statementImport");
  const fileId = useId();
  const balanceColumn = hasBalanceColumn(connection.connection.csv_mapping);
  const askTwice = first && !balanceColumn;

  // Every check is here, so the messages come in a fixed order and none shows while typing.
  const schema = z
    .object({
      file: z.custom<File | null>(),
      exportBalance: z.custom<Decimal | null>(),
      confirmation: z.custom<Decimal | null>(),
    })
    .superRefine(({ file: chosen, exportBalance, confirmation }, context) => {
      const issue = (path: string, message: string) => {
        context.addIssue({ code: "custom", path: [path], message });
      };
      if (chosen === null) {
        issue("file", t("file.fileRequired"));
      } else if (chosen.size === 0) {
        issue("file", t("file.fileEmpty"));
      }
      if (exportBalance === null) {
        issue("exportBalance", t("file.exportBalanceRequired"));
      }
      if (!askTwice) {
        return;
      }
      if (confirmation === null) {
        issue("confirmation", t("file.confirmationRequired"));
      } else if (exportBalance !== null && confirmation !== exportBalance) {
        issue("confirmation", t("file.mismatch"));
      }
    });

  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      file: initial?.file ?? null,
      exportBalance: initial?.exportBalance ?? null,
      confirmation: initial?.confirmation ?? null,
    },
  });
  const { errors } = form.formState;
  const file = useWatch({ control: form.control, name: "file" });

  const chooseFile = (chosen: File | undefined) => {
    if (chosen !== undefined) {
      form.setValue("file", chosen, { shouldValidate: true });
    }
  };
  const dropZone = useRef<HTMLDivElement>(null);
  const dragging = useFileDrop(dropZone, chooseFile);

  const params = { householdId, accountId };
  const fileError = errors.file?.message;

  return (
    <Card>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(({ file: chosen, exportBalance, confirmation }) => {
            if (chosen === null || exportBalance === null) {
              return;
            }
            onSubmit({
              file: chosen,
              exportBalance,
              ...(askTwice && confirmation !== null ? { confirmation } : {}),
            });
          })(event);
        }}
        // The Card lays out the header, content and footer.
        className="contents"
      >
        <CardHeader>
          <CardTitle>
            <h3>{t("file.title")}</h3>
          </CardTitle>
          <CardDescription>
            {t("connection.through", { connection: connection.name })}
            {canChangeConnection && (
              <>
                {" · "}
                <Link
                  to="/households/$householdId/accounts/$accountId/statement-imports/new"
                  params={params}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  {t("connection.change")}
                </Link>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {error !== null && (
              <Refusal
                error={error}
                householdId={householdId}
                accountId={accountId}
                connectionId={connection.connection.connection_id}
              />
            )}
            <Field data-invalid={fileError !== undefined}>
              <div
                role="group"
                aria-labelledby={`${fileId}-chosen`}
                ref={dropZone}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 text-center",
                  dragging && "border-primary bg-primary/5",
                  file !== null && !dragging && "border-primary/50",
                  fileError !== undefined && "border-destructive",
                )}
              >
                {file === null ? (
                  <UploadIcon aria-hidden="true" className="size-8 text-muted-foreground" />
                ) : (
                  <FileSpreadsheetIcon aria-hidden="true" className="size-8" />
                )}
                <p id={`${fileId}-chosen`} className="font-medium break-all">
                  {file === null
                    ? t("file.dropZone")
                    : t("file.chosen", { name: file.name, size: formatFileSize(file.size) })}
                </p>
                <Controller
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <input
                      id={fileId}
                      ref={field.ref}
                      name={field.name}
                      type="file"
                      accept={accept}
                      className="peer sr-only"
                      aria-invalid={fileError !== undefined}
                      aria-describedby={[
                        `${fileId}-chosen`,
                        fileError === undefined ? undefined : `${fileId}-error`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onChange={(event) => {
                        chooseFile(event.target.files?.[0]);
                        // The same file can be chosen again after it was replaced.
                        event.target.value = "";
                      }}
                    />
                  )}
                />
                <label
                  htmlFor={fileId}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "cursor-pointer peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                  )}
                >
                  {file === null ? t("file.choose") : t("file.replace")}
                </label>
              </div>
              {fileError !== undefined && (
                <FieldError id={`${fileId}-error`}>{fileError}</FieldError>
              )}
            </Field>
            <Controller
              control={form.control}
              name="exportBalance"
              render={({ field }) => (
                <AmountInput
                  label={t("file.exportBalance")}
                  currency={currency}
                  decimalPlaces={decimalPlaces}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // A changed value drops its error at once; checks run on blur and submit.
                    form.clearErrors(field.name);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  description={
                    balanceColumn
                      ? t("file.exportBalanceCheckedHelp", { currency })
                      : t("file.exportBalanceHelp", { currency })
                  }
                  {...(errors.exportBalance?.message === undefined
                    ? {}
                    : { error: errors.exportBalance.message })}
                />
              )}
            />
            {askTwice && (
              <Controller
                control={form.control}
                name="confirmation"
                render={({ field }) => (
                  <AmountInput
                    label={t("file.confirmation")}
                    currency={currency}
                    decimalPlaces={decimalPlaces}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // A changed value drops its error at once; checks run on blur and submit.
                      form.clearErrors(field.name);
                    }}
                    onBlur={field.onBlur}
                    onPaste={(event) => {
                      event.preventDefault();
                    }}
                    name={field.name}
                    description={t("file.confirmationHelp")}
                    {...(errors.confirmation?.message === undefined
                      ? {}
                      : { error: errors.confirmation.message })}
                  />
                )}
              />
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          {onBack === undefined ? (
            <span />
          ) : (
            <Button type="button" variant="ghost" onClick={onBack}>
              {t("file.back")}
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {first
              ? pending
                ? t("file.previewing")
                : t("file.preview")
              : pending
                ? t("file.importing")
                : t("file.import")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
