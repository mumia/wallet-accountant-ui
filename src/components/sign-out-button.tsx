import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

import { Button } from "./ui/button";

/** Signs out of Zitadel, which comes back to `postLogoutRedirectPath`. */
export function SignOutButton() {
  const { t } = useTranslation();
  const auth = useAuth();
  return (
    <Button variant="link" size="sm" onClick={() => void auth.signoutRedirect()}>
      {t("signOut")}
    </Button>
  );
}
