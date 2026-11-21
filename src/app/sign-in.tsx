import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const ended = useSyncExternalStore(signal.subscribe, signal.ended);

  useEffect(() => {
    if (ended && dialog.current?.open === false) {
      dialog.current.showModal();
    }
  }, [ended]);

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={bodyId}>
      <h2 id={titleId}>{t("sessionEnded.title")}</h2>
      <p id={bodyId}>{t("sessionEnded.body")}</p>
      <button type="button" onClick={() => void auth.signinRedirect({ state: currentPage() })}>
        {t("sessionEnded.signIn")}
      </button>
      <button type="button" onClick={() => dialog.current?.close()}>
        {t("sessionEnded.close")}
      </button>
    </dialog>
  );
}
