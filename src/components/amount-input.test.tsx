import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../app/i18n";
import type { Decimal } from "../lib/money";
import { AmountInput } from "./amount-input";

function Harness({ places = 2, locale = "en-US" }: { places?: number; locale?: string }) {
  const [value, setValue] = useState<Decimal | null>(null);
  return (
    <>
      <AmountInput
        label="Export balance"
        currency="EUR"
        decimalPlaces={places}
        value={value}
        onValueChange={setValue}
        locale={locale}
      />
      <output>{value ?? "none"}</output>
    </>
  );
}

describe("AmountInput", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("is a text field labelled with the currency", () => {
    render(<Harness />);

    const field = screen.getByRole("textbox", { name: "Export balance (EUR)" });
    expect(field).toHaveAttribute("inputmode", "decimal");
    expect(field).toHaveAttribute("type", "text");
  });

  it("keeps exact decimal text and formats only on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole("textbox", { name: "Export balance (EUR)" });

    await user.type(field, "-1234.5");
    expect(field).toHaveValue("-1234.5");
    expect(screen.getByRole("status")).toHaveTextContent("-1234.50");

    await user.tab();
    expect(field).toHaveValue("-1,234.50");
  });

  it("never moves the caret while typing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole<HTMLInputElement>("textbox", { name: "Export balance (EUR)" });

    await user.type(field, "12345");
    await user.keyboard("{ArrowLeft}{ArrowLeft}9");

    expect(field).toHaveValue("123945");
    expect(field.selectionStart).toBe(4);
  });

  it("reads the locale's separators", async () => {
    const user = userEvent.setup();
    render(<Harness locale="de-DE" />);

    await user.type(screen.getByRole("textbox"), "1.234,56");

    expect(screen.getByRole("status")).toHaveTextContent("1234.56");
  });

  it("refuses more places than the currency has, linked to the field", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole("textbox", { name: "Export balance (EUR)" });

    await user.type(field, "1.234");

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("EUR amounts have at most 2 decimal places");
    expect(screen.getByRole("status")).toHaveTextContent("none");
  });

  it("says what to type only once the field is left", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole("textbox", { name: "Export balance (EUR)" });

    await user.type(field, "abc");
    expect(field).toHaveAttribute("aria-invalid", "false");

    await user.tab();
    expect(field).toHaveAccessibleDescription("Type an amount, such as 1,234.55");
  });
});
