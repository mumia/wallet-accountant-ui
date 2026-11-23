import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../../app/i18n";
import { columnsFor, headerKey, newMappingForm, pickColumn } from "../../lib/csv-mapping";
import { sampleTable } from "../../lib/csv-sample";
import { SampleTable } from "./sample-table";

const table = sampleTable(
  new TextEncoder().encode("Date;Text;Amount\n2026-01-02;Coffee;-3.50\n2026-01-03;Tea;-2.00\n"),
  { encoding: "UTF_8", delimiter: ";", skipLeadingLines: 0, hasHeaderRow: true },
);

/** The table with picks kept as the editor keeps them, shown for the test to read. */
function Harness() {
  const [picks, setPicks] = useState(newMappingForm("x").columns);
  const keyOf = (index: number) => headerKey(table.header?.[index] ?? "");
  return (
    <>
      <SampleTable
        fileName="sample.csv"
        table={table}
        fields={columnsFor("SIGNED")}
        picks={picks}
        keyOf={keyOf}
        onPick={(index, field) => {
          setPicks((current) => pickColumn(current, keyOf(index), field));
        }}
      />
      <output>
        {Object.entries(picks)
          .filter(([, key]) => key !== "")
          .map(([field, key]) => `${field}=${key}`)
          .join(" ")}
      </output>
    </>
  );
}

const columnButton = (number: number) =>
  screen.getByRole("button", { name: new RegExp(`^What column ${String(number)} holds`) });

async function pick(user: ReturnType<typeof userEvent.setup>, number: number, field: string) {
  columnButton(number).focus();
  await user.keyboard("{Enter}");
  const menu = await screen.findByRole("menu");
  await user.click(within(menu).getByRole("menuitemradio", { name: field }));
  await waitFor(() => {
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
}

describe("SampleTable", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("shows the sample's rows under its header", () => {
    render(<Harness />);
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Column 1: DateNot usedColumn 2: TextNot usedColumn 3: AmountNot used",
      "2026-01-02Coffee-3.50",
      "2026-01-03Tea-2.00",
    ]);
  });

  it("picks what a column holds from its menu, by keyboard", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    columnButton(1).focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    expect(
      within(menu)
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent),
    ).toEqual([
      "Not used",
      "Booking date",
      "Description",
      "Amount",
      "Transaction date",
      "Value date",
      "Payee",
      "Bank transaction ID",
    ]);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("booking_date=h:Date");
    expect(columnButton(1)).toHaveAccessibleName("What column 1 holds: Booking date");
  });

  it("moves a field to the column picked last, and frees a column", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await pick(user, 2, "Description");
    await pick(user, 3, "Description");
    expect(screen.getByRole("status")).toHaveTextContent(/^description=h:Amount$/);
    expect(columnButton(2)).toHaveAccessibleName("What column 2 holds: Not used");

    await pick(user, 3, "Amount");
    expect(screen.getByRole("status")).toHaveTextContent(/^amount=h:Amount$/);

    await pick(user, 3, "Not used");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
