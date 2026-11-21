// The signed-in User's bearer token on every request, and what a 401 means
// (spec, "Talking to the API"): renew the token once and resend once; if that
// fails, the session has ended and the User is asked to sign in again.
import type { Middleware } from "openapi-fetch";

export interface ApiAuth {
  /** The current access token, if signed in. */
  accessToken: () => Promise<string | undefined>;
  /** Renews the session (with the refresh token); the new access token, or undefined. */
  renew: () => Promise<string | undefined>;
  /** Called when renewing failed or the renewed token was refused too. */
  sessionEnded: () => void;
}

export function bearerAuth(auth: ApiAuth): Middleware {
  /** An unsent copy of each request in flight, by openapi-fetch's request id, for the resend. */
  const copies = new Map<string, Request>();
  /** One renewal at a time: refresh tokens rotate, so a second use would fail. */
  let renewing: Promise<string | undefined> | undefined;

  const renewOnce = () => {
    renewing ??= auth
      .renew()
      .catch(() => undefined)
      .finally(() => {
        renewing = undefined;
      });
    return renewing;
  };

  return {
    async onRequest({ request, id }) {
      const token = await auth.accessToken();
      if (token !== undefined) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      copies.set(id, request.clone());
      return request;
    },
    async onResponse({ response, id }) {
      const copy = copies.get(id);
      copies.delete(id);
      if (response.status !== 401 || copy === undefined) {
        return undefined;
      }
      const token = await renewOnce();
      if (token === undefined) {
        auth.sessionEnded();
        return undefined;
      }
      copy.headers.set("Authorization", `Bearer ${token}`);
      const resent = await globalThis.fetch(copy);
      if (resent.status === 401) {
        auth.sessionEnded();
      }
      return resent;
    },
    onError({ id }) {
      copies.delete(id);
      return undefined;
    },
  };
}
