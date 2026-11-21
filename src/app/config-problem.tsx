import { useTranslation } from "react-i18next";

/** Shown when /config.json is missing or wrong: something for whoever runs the app to fix. */
export function ConfigProblem({ problem }: { problem: string }) {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t("configProblem.title")}</h1>
      <p>{t("configProblem.body")}</p>
      <pre>{problem}</pre>
    </main>
  );
}
