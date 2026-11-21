import { useTranslation } from "react-i18next";

/** The Category tree: a stub until ticket 09. */
export function CategoriesPage() {
  const { t } = useTranslation("categories");
  return (
    <div className="mx-auto grid max-w-3xl gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p>{t("stub")}</p>
    </div>
  );
}
