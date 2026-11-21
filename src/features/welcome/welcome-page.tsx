import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppearanceDialog } from "../../components/appearance-dialog";
import { Button } from "../../components/ui/button";

/**
 * A placeholder home until first run (ticket 06) replaces `/` with its redirect.
 * It opens Appearance… until the User menu (ticket 07) does.
 */
export function WelcomePage() {
  const { t } = useTranslation();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <main className="mx-auto grid max-w-xl gap-4 p-8">
      <h1 className="text-2xl font-semibold">{t("appName")}</h1>
      <p className="text-muted-foreground">{t("welcome.tagline")}</p>
      <div>
        <Button
          variant="outline"
          onClick={() => {
            setAppearanceOpen(true);
          }}
        >
          {t("appearance.open")}
        </Button>
      </div>
      <AppearanceDialog open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </main>
  );
}
