import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { isNetworkError, isProblem } from "../api/problem";

export interface ErrorText {
  title: string;
  detail?: string;
}

/**
 * What to tell the User about a failed request (spec, "Talking to the API"): the
 * problem's own `title` and `detail`, untranslated, or a message of ours when
 * there is no problem to show.
 */
export function errorText(error: unknown, t: TFunction): ErrorText {
  if (isProblem(error) && error.title !== "") {
    return error.detail === undefined
      ? { title: error.title }
      : { title: error.title, detail: error.detail };
  }
  if (isNetworkError(error)) {
    return { title: t("errors.network.title"), detail: t("errors.network.detail") };
  }
  return { title: t("errors.generic.title"), detail: t("errors.generic.detail") };
}

/** `errorText` for a component. */
export function useErrorText(error: unknown): ErrorText {
  const { t } = useTranslation();
  return errorText(error, t);
}
