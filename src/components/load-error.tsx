import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useErrorText } from "./error-text";
import { Button } from "./ui/button";

/** A screen that couldn't load: what went wrong, and "Try again". */
export function LoadError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryReset = useQueryErrorResetBoundary();
  const { title, detail } = useErrorText(error);
  return (
    <main className="mx-auto grid max-w-xl gap-3 p-8" role="alert">
      <h1 className="text-xl font-semibold">{title}</h1>
      {detail !== undefined && <p className="text-muted-foreground">{detail}</p>}
      <div>
        <Button
          onClick={() => {
            queryReset.reset();
            reset();
            void router.invalidate();
          }}
        >
          {t("errors.tryAgain")}
        </Button>
      </div>
    </main>
  );
}
