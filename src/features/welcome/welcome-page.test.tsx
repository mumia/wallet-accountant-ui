import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../../app/i18n";
import { WelcomePage } from "./welcome-page";

describe("WelcomePage", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("names the app from the message files", () => {
    render(<WelcomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Wallet Accountant" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/close every month/)).toBeInTheDocument();
  });
});
