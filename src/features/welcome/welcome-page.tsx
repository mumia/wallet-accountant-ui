import { useTranslation } from "react-i18next";

/** A placeholder home until first run (ticket 06) replaces `/` with its redirect. */
export function WelcomePage() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t("appName")}</h1>
      <p>{t("welcome.tagline")}</p>
    </main>
  );
}
