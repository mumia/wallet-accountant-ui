import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "./i18n";
import { UnsupportedBrowser } from "./unsupported-browser";

describe("UnsupportedBrowser", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("says which browsers show amounts exactly", () => {
    render(<UnsupportedBrowser />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/too old/);
    expect(screen.getByText(/Safari 18\.4/)).toBeInTheDocument();
  });
});
