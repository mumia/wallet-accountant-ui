import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../app/i18n";
import type { IsoDate } from "../lib/date";
import { DateInput } from "./date-input";

function Harness({
  initial = null,
  min,
  max,
}: {
  initial?: IsoDate | null;
  min?: IsoDate;
  max?: IsoDate;
}) {
  const [value, setValue] = useState<IsoDate | null>(initial);
  return (
    <>
      <label htmlFor="start">Start date</label>
      <DateInput
        id="start"
        value={value}
        onValueChange={setValue}
        locale="en-GB"
        {...(min === undefined ? {} : { min })}
        {...(max === undefined ? {} : { max })}
      />
      <output>{value ?? "none"}</output>
    </>
  );
}

describe("DateInput", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("shows its date in the locale's order", () => {
    render(<Harness initial="2026-11-01" />);

    expect(screen.getByRole("textbox", { name: "Start date" })).toHaveValue("01/11/2026");
    expect(screen.getByRole("button", { name: "Choose a date" })).toBeInTheDocument();
  });

  it("reads what is typed, and formats it only on blur", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole("textbox", { name: "Start date" });

    await user.type(field, "3.2.26");
    expect(screen.getByRole("status")).toHaveTextContent("2026-02-03");
    expect(field).toHaveValue("3.2.26");

    await user.tab();
    expect(field).toHaveValue("03/02/2026");
  });

  it("holds no date while the text isn't one", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-11-01" />);
    const field = screen.getByRole("textbox", { name: "Start date" });

    await user.clear(field);
    await user.type(field, "31/02/2026");
    await user.tab();

    expect(screen.getByRole("status")).toHaveTextContent("none");
    expect(field).toHaveValue("31/02/2026");
  });

  it("picks a day from the calendar with the keyboard, across months", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-11-01" />);

    await user.click(screen.getByRole("button", { name: "Choose a date" }));
    expect(await screen.findByRole("button", { name: /\b1 November 2026/ })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: /\b31 October 2026/ })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("2026-10-31");
    expect(screen.getByRole("textbox", { name: "Start date" })).toHaveValue("31/10/2026");
  });

  it("disables the days before `min` and after `max` in the calendar", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-11-10" min="2026-11-03" max="2026-11-20" />);

    await user.click(screen.getByRole("button", { name: "Choose a date" }));
    expect(await screen.findByRole("button", { name: /\b2 November 2026/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /\b3 November 2026/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /\b20 November 2026/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /\b21 November 2026/ })).toBeDisabled();
  });
});
