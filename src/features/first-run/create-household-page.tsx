import { useTranslation } from "react-i18next";

import { HouseholdForm } from "../../components/household-form";
import { FirstRunCard } from "./first-run-card";

/** Create the User's first Household (spec, "First run"). */
export function CreateHouseholdPage() {
  const { t } = useTranslation("firstRun");
  return (
    <FirstRunCard title={t("createHousehold.title")} description={t("createHousehold.welcome")}>
      <HouseholdForm />
    </FirstRunCard>
  );
}
