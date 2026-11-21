// The sign-in session (spec, "Stack" and "Talking to the API"): oidc-client-ts
// against Zitadel's `web` app, authorization code with PKCE, refresh tokens in
// sessionStorage, renewed in the background. No backend-for-frontend.
import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";

import type { ApiAuth } from "../api/auth";
import type { Config } from "./config";

export function userManagerSettings(config: Config, origin: string): UserManagerSettings {
  return {
    authority: config.oidc.issuer,
    client_id: config.oidc.clientId,
    redirect_uri: origin + config.oidc.redirectPath,
    post_logout_redirect_uri: origin + config.oidc.postLogoutRedirectPath,
    response_type: "code",
    // offline_access asks for a refresh token; email is shown on /register.
    scope: "openid profile email offline_access",
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    // The PKCE verifier and state of a sign-in in flight. oidc-client-ts would
    // use localStorage, which may be blocked; the redirect comes back to this tab.
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
  };
}

/** What a sign-in redirect carries through Zitadel and back. */
export interface SignInState {
  returnTo: string;
}

/** The page to come back to: the current path, query and hash. */
export function currentPage(): SignInState {
  const { pathname, search, hash } = window.location;
  return { returnTo: pathname + search + hash };
}

/**
 * Where to go after signing in: the page the User was on, but only a path on
 * this origin, so the state can never send anyone elsewhere.
 */
export function returnPath(state: unknown): string {
  if (typeof state !== "object" || state === null) {
    return "/";
  }
  const { returnTo } = state as Record<string, unknown>;
  if (typeof returnTo !== "string" || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }
  return returnTo;
}

/** A tiny store the session-ended dialog subscribes to. */
export interface SessionEndedSignal {
  subscribe: (listener: () => void) => () => void;
  ended: () => boolean;
  end: () => void;
}

export function createSessionEndedSignal(): SessionEndedSignal {
  const listeners = new Set<() => void>();
  let isEnded = false;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ended: () => isEnded,
    end() {
      if (!isEnded) {
        isEnded = true;
        listeners.forEach((listener) => {
          listener();
        });
      }
    },
  };
}

export interface Session {
  userManager: UserManager;
  sessionEnded: SessionEndedSignal;
  apiAuth: ApiAuth;
}

export function createSession(config: Config): Session {
  const userManager = new UserManager(userManagerSettings(config, window.location.origin));
  const sessionEnded = createSessionEndedSignal();
  userManager.events.addSilentRenewError(() => {
    sessionEnded.end();
  });
  return {
    userManager,
    sessionEnded,
    apiAuth: {
      accessToken: async () => {
        const user = await userManager.getUser();
        return user === null || user.expired === true ? undefined : user.access_token;
      },
      renew: async () => (await userManager.signinSilent())?.access_token,
      sessionEnded: sessionEnded.end,
    },
  };
}
