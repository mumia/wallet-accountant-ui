import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { AuthContext, type AuthContextProps } from "react-oidc-context";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { initI18n } from "./i18n";
import { createSessionEndedSignal } from "./session";
import { SessionEndedDialog, SignInGate } from "./sign-in";

function fakeAuth(state: Partial<AuthContextProps>) {
  const signinRedirect = vi.fn(() => Promise.resolve());
  const value = {
    isLoading: false,
    isAuthenticated: false,
    signinRedirect,
    ...state,
  } as unknown as AuthContextProps;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext value={value}>{children}</AuthContext>
  );
  return { signinRedirect, wrapper };
}

describe("SignInGate", () => {
  beforeAll(async () => {
    await initI18n();
    window.history.replaceState(null, "", "/households/1/categories?x=1");
  });

  it("sends a signed-out User to sign in, to come back to the same page", () => {
    const { signinRedirect, wrapper } = fakeAuth({});

    render(<SignInGate>app</SignInGate>, { wrapper });

    expect(screen.getByText("Signing in…")).toBeInTheDocument();
    expect(screen.queryByText("app")).not.toBeInTheDocument();
    expect(signinRedirect).toHaveBeenCalledWith({
      state: { returnTo: "/households/1/categories?x=1" },
    });
  });

  it("waits while the sign-in is being finished", () => {
    const { signinRedirect, wrapper } = fakeAuth({ isLoading: true });

    render(<SignInGate>app</SignInGate>, { wrapper });

    expect(signinRedirect).not.toHaveBeenCalled();
  });

  it("shows the app to a signed-in User", () => {
    const { wrapper } = fakeAuth({ isAuthenticated: true });

    render(<SignInGate>app</SignInGate>, { wrapper });

    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("says when signing in failed, and offers to try again", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("access_denied"), { source: "signinCallback" as const });
    const { signinRedirect, wrapper } = fakeAuth({ error });

    render(<SignInGate>app</SignInGate>, { wrapper });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByRole("heading", { name: "Signing in didn't work" })).toBeInTheDocument();
    expect(screen.getByText("access_denied")).toBeInTheDocument();
    expect(signinRedirect).toHaveBeenCalledOnce();
  });
});

describe("SessionEndedDialog", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("opens when the session ends and signs in again to the same page", async () => {
    const user = userEvent.setup();
    const signal = createSessionEndedSignal();
    const { signinRedirect, wrapper } = fakeAuth({ isAuthenticated: true });
    window.history.replaceState(null, "", "/households/1/accounts/2/to-review");
    render(<SessionEndedDialog signal={signal} />, { wrapper });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      signal.end();
    });
    const dialog = screen.getByRole("dialog", { name: "Your session has ended" });
    expect(dialog).toHaveAccessibleDescription(/Sign in again to carry on/);
    await user.click(screen.getByRole("button", { name: "Sign in again" }));

    expect(signinRedirect).toHaveBeenCalledWith({
      state: { returnTo: "/households/1/accounts/2/to-review" },
    });
  });
});
