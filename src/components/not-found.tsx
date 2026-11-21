import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { MainLandmark } from "./main-landmark";

/** A page or record that doesn't exist, or that the User may not see. */
export function NotFound() {
  const { t } = useTranslation();
  return (
    <MainLandmark className="mx-auto grid max-w-xl gap-3 p-8">
      <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
      <p className="text-muted-foreground">{t("notFound.body")}</p>
      <p>
        <Link to="/" className="underline underline-offset-4">
          {t("notFound.home")}
        </Link>
      </p>
    </MainLandmark>
  );
}
