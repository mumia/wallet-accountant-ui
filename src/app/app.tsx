import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider } from "react-oidc-context";

import { createApi } from "../api/client";
import { ApiContext } from "../api/context";
import type { Config } from "./config";
import { createQueryClient } from "./query-client";
import { createAppRouter } from "./router";
import { createSession, returnPath } from "./session";
import { SessionEndedDialog, SignInGate } from "./sign-in";

/** The app for a signed-in User, wired from /config.json. */
export function App({ config }: { config: Config }) {
  const [wiring] = useState(() => {
    const session = createSession(config);
    const api = createApi({ baseUrl: config.apiBaseUrl, auth: session.apiAuth });
    const queryClient = createQueryClient();
    return {
      session,
      api,
      queryClient,
      router: createAppRouter({ api: api.api, queryClient }),
    };
  });

  return (
    <AuthProvider
      userManager={wiring.session.userManager}
      onSigninCallback={(user) => {
        // Leave /auth/callback for the page the User started from.
        void wiring.router.navigate({ href: returnPath(user?.state), replace: true });
      }}
    >
      <SignInGate>
        <ApiContext value={wiring.api}>
          <QueryClientProvider client={wiring.queryClient}>
            <RouterProvider router={wiring.router} />
          </QueryClientProvider>
        </ApiContext>
        <SessionEndedDialog signal={wiring.session.sessionEnded} />
      </SignInGate>
    </AuthProvider>
  );
}
