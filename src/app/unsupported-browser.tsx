import { useTranslation } from "react-i18next";

/**
 * Shown instead of the app when the browser can't read JSON source text: amounts
 * couldn't be exact, so the app never starts there (ADR-0002).
 */
export function UnsupportedBrowser() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t("unsupportedBrowser.title")}</h1>
      <p>{t("unsupportedBrowser.body")}</p>
    </main>
  );
}
