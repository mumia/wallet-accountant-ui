import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { currentPage, type SessionEndedSignal } from "./session";

/**
 * Shows the app only to a signed-in User. Anyone else goes to Zitadel and comes
 * back to the same page (react-oidc-context finishes the sign-in on
 * /auth/callback before this renders the app).
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const mustSignIn =
    !auth.isLoading &&
    !auth.isAuthenticated &&
    auth.error === undefined &&
    auth.activeNavigator === undefined;

  useEffect(() => {
    if (mustSignIn) {
      void auth.signinRedirect({ state: currentPage() });
    }
  }, [mustSignIn, auth]);

  if (auth.error !== undefined) {
    return (
      <main>
        <h1>{t("signIn.failedTitle")}</h1>
        <p>{auth.error.message}</p>
        <button type="button" onClick={() => void auth.signinRedirect({ state: currentPage() })}>
          {t("signIn.tryAgain")}
        </button>
      </main>
    );
  }
  if (!auth.isAuthenticated) {
    return (
      <main aria-busy="true">
        <p>{t("signIn.signingIn")}</p>
      </main>
    );
  }
  return children;
}

/**
 * "Your session has ended — Sign in again" (spec, "Talking to the API"): shown
 * when the token couldn't be renewed. Signing in comes back to the same page;
 * input in an open form is lost.
 */
export function SessionEndedDialog({ signal }: { signal: SessionEndedSignal }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const ended = useSyncExternalStore(signal.subscribe, signal.ended);
  const [dismissed, setDismissed] = useState(false);

  return (
    <Dialog
      open={ended && !dismissed}
      onOpenChange={(open) => {
        setDismissed(!open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("sessionEnded.title")}</DialogTitle>
          <DialogDescription>{t("sessionEnded.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => void auth.signinRedirect({ state: currentPage() })}>
            {t("sessionEnded.signIn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
