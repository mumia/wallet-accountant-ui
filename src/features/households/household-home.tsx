import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { AppearanceDialog } from "../../components/appearance-dialog";
import { SignOutButton } from "../../components/sign-out-button";
import { Button } from "../../components/ui/button";
import { saveLastHousehold } from "../../lib/last-household";

/**
 * A Household's home: a stub until the shell and the Accounts overview
 * (ticket 07). It opens Appearance… until the User menu does.
 */
export function HouseholdHome({ householdId }: { householdId: string }) {
  const { t } = useTranslation("households");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  // The route's loader has fetched it already.
  const { data: household } = api.useSuspenseQuery("get", "/households/{household_id}", {
    params: { path: { household_id: householdId } },
  });

  useEffect(() => {
    saveLastHousehold(householdId);
  }, [householdId]);

  return (
    <main className="mx-auto grid max-w-xl gap-4 p-8">
      <p className="text-sm text-muted-foreground">{tCommon("appName")}</p>
      <h1 className="text-2xl font-semibold">{household.name}</h1>
      <p className="text-muted-foreground">{t("home.stub")}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setAppearanceOpen(true);
          }}
        >
          {tCommon("appearance.open")}
        </Button>
        <SignOutButton />
      </div>
      <AppearanceDialog open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </main>
  );
}
