import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useConnectionNames } from "../../components/connection-names";
import { cn } from "cn";
import { ConnectionStep, NoConnection } from "./connection-step";
import { FileStep } from "./file-step";
import { PreviewStep } from "./preview-step";
import { ResultStep } from "./result-step";
import {
  usePreview,
  useUpload,
  type StatementImport,
  type StatementImportPreview,
  type StatementInput,
} from "./statement-import-query";

type Step = "connection" | "file" | "preview" | "result";

/**
 * The Statement import flow (spec, "Statement import flow"): a stepper, one
 * card per step: the Connection, the file and its Export balance, the Opening
 * balance preview on a first import, and the result. Everything typed stays in
 * page memory: Back keeps it, a reload starts over.
 */
export function StatementImportPage({
  householdId,
  accountId,
  linkedConnectionId,
}: {
  householdId: string;
  accountId: string;
  /** `?connection_id=`, which skips choosing the Connection. */
  linkedConnectionId: string | undefined;
}) {
  const { t } = useTranslation("statementImport");
  const { api } = useApi();
  const path = { params: { path: { household_id: householdId, account_id: accountId } } };
  // The route's loaders have fetched these.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    path,
  );
  const { data: connectionList } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/connections",
    path,
  );
  const { data: currencies } = api.useSuspenseQuery("get", "/currencies");
  const decimalPlaces =
    currencies.items.find(({ code }) => code === account.currency)?.decimal_places ?? 2;

  const connections = useConnectionNames(connectionList.items);
  const usable = connections.filter(({ connection }) => connection.csv_mapping !== undefined);
  const linked = usable.find(({ connection }) => connection.connection_id === linkedConnectionId);
  const onlyOne = connections.length === 1 ? usable[0] : undefined;
  const skipsConnection = linked !== undefined || onlyOne !== undefined;

  const [connectionId, setConnectionId] = useState((linked ?? onlyOne)?.connection.connection_id);
  const [step, setStep] = useState<Step>(skipsConnection ? "file" : "connection");
  const [input, setInput] = useState<StatementInput>();
  const [preview, setPreview] = useState<StatementImportPreview>();
  const [result, setResult] = useState<StatementImport>();
  const previewing = usePreview(householdId, accountId);
  const uploading = useUpload(householdId, accountId);

  // After the import the Account no longer awaits its first one; the result says which it was.
  const first =
    result === undefined
      ? account.awaiting_first_statement_import || step === "preview"
      : result.opening_balance !== undefined;
  const steps: Step[] = [
    ...(skipsConnection ? [] : (["connection"] as const)),
    "file",
    ...(first ? (["preview"] as const) : []),
    "result",
  ];
  const chosen = connections.find(({ connection }) => connection.connection_id === connectionId);

  // Each new step's card takes focus, so keyboard and screen reader users land on it.
  const cardRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current !== step) {
      shownStep.current = step;
      cardRef.current?.focus();
    }
  }, [step]);

  if (connections.length === 0) {
    return (
      <Layout title={account.awaiting_first_statement_import ? t("titleFirst") : t("title")}>
        <NoConnection householdId={householdId} accountId={accountId} />
      </Layout>
    );
  }

  const goTo = (next: Step) => {
    previewing.reset();
    uploading.reset();
    setStep(next);
  };

  const submitFile = (typed: StatementInput) => {
    if (connectionId === undefined) {
      return;
    }
    setInput(typed);
    if (account.awaiting_first_statement_import) {
      previewing.mutate(
        { connectionId, input: typed },
        {
          onSuccess: (read) => {
            setPreview(read);
            setStep("preview");
          },
        },
      );
    } else {
      uploading.mutate(
        { connectionId, input: typed },
        {
          onSuccess: (recorded) => {
            setResult(recorded);
            setStep("result");
          },
        },
      );
    }
  };

  const confirm = () => {
    if (connectionId === undefined || input === undefined || preview === undefined) {
      return;
    }
    uploading.mutate(
      { connectionId, input, previewId: preview.preview_id },
      {
        onSuccess: (recorded) => {
          setResult(recorded);
          setStep("result");
        },
      },
    );
  };

  return (
    <Layout title={first ? t("titleFirst") : t("title")}>
      <Stepper steps={steps} current={step} />
      <div ref={cardRef} tabIndex={-1} className="outline-none">
        {step === "connection" && (
          <ConnectionStep
            householdId={householdId}
            accountId={accountId}
            connections={connections}
            chosenId={connectionId}
            onContinue={(id) => {
              setConnectionId(id);
              goTo("file");
            }}
          />
        )}
        {step === "file" && chosen !== undefined && (
          <FileStep
            key={first ? "first" : "later"}
            householdId={householdId}
            accountId={accountId}
            connection={chosen}
            canChangeConnection={linked !== undefined && connections.length > 1}
            currency={account.currency}
            decimalPlaces={decimalPlaces}
            first={account.awaiting_first_statement_import}
            initial={input}
            pending={previewing.isPending || uploading.isPending}
            error={previewing.error ?? uploading.error}
            onBack={
              skipsConnection
                ? undefined
                : () => {
                    goTo("connection");
                  }
            }
            onSubmit={submitFile}
          />
        )}
        {step === "preview" && preview !== undefined && input !== undefined && chosen && (
          <PreviewStep
            householdId={householdId}
            accountId={accountId}
            preview={preview}
            fileName={input.file.name}
            connection={chosen}
            pending={uploading.isPending}
            error={uploading.error}
            onBack={() => {
              goTo("file");
            }}
            onConfirm={confirm}
          />
        )}
        {step === "result" && result !== undefined && (
          <ResultStep householdId={householdId} accountId={accountId} result={result} />
        )}
      </div>
    </Layout>
  );
}

function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Stepper({ steps, current }: { steps: Step[]; current: Step }) {
  const { t } = useTranslation("statementImport");
  const index = steps.indexOf(current);
  return (
    <ol aria-label={t("steps.label")} className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((step, i) => {
        const label = t(`steps.${step}`);
        const state = i < index ? "done" : i === index ? "current" : "next";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                state === "done" && "border-primary bg-primary text-primary-foreground",
                state === "current" && "border-primary text-foreground",
                state === "next" && "text-muted-foreground",
              )}
            >
              {state === "done" ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <span className={state === "current" ? "font-medium" : "text-muted-foreground"}>
              {state === "done" ? (
                <>
                  {label}
                  <span className="sr-only">{t("steps.doneSuffix")}</span>
                </>
              ) : (
                label
              )}
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
