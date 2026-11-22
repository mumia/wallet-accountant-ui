import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { initI18n } from "../../app/i18n";
import { extensibleEnum } from "../../test/contract";
import { importedStates, ReviewTable } from "./review-table";
import type { ImportedTransaction } from "./to-review-query";

function row(n: number, extra: Partial<ImportedTransaction> = {}): ImportedTransaction {
  return {
    imported_transaction_id: `row-${String(n)}`,
    statement_import_id: "import-1",
    state: "PENDING",
    line: n + 1,
    booking_date: `2026-11-1${String(n)}`,
    transaction_date: `2026-11-1${String(n)}`,
    amount: { amount: `-${String(n)}.50` as `${number}`, currency: "EUR" },
    description: `Shop ${String(n)}`,
    ...extra,
  };
}

const rows = [row(1), row(2), row(3), row(4), row(5)];

function Harness({ section = "pending" as const }: { section?: "pending" | "suspected" }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  return (
    <ReviewTable
      section={section}
      rows={rows}
      selected={selected}
      onSelectionChange={setSelected}
      onAccept={vi.fn()}
      onKeep={vi.fn()}
      onDiscard={vi.fn()}
    />
  );
}

const box = (name: RegExp | string) => screen.getByRole("checkbox", { name });
const checked = () =>
  screen
    .getAllByRole("checkbox")
    .filter((checkbox) => (checkbox as HTMLInputElement).checked)
    .map((checkbox) => checkbox.getAttribute("aria-label"));

describe("bulk selection", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("labels each checkbox from its row, and the header from its section", () => {
    render(<Harness />);

    expect(box("Select all Pending rows")).not.toBeChecked();
    expect(box("Select Nov 11, 2026, Shop 1, -€1.50")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
  });

  it("selects by keyboard, the header showing a mixed state", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(box("Select all Pending rows")).toHaveFocus();
    await user.tab();
    expect(box(/Shop 1/)).toHaveFocus();
    await user.keyboard(" ");

    expect(box(/Shop 1/)).toBeChecked();
    expect(box("Select all Pending rows")).toBePartiallyChecked();

    await user.keyboard(" ");
    expect(box(/Shop 1/)).not.toBeChecked();
    expect(box("Select all Pending rows")).not.toBePartiallyChecked();
  });

  it("selects a range with Shift+click, and clears one the same way", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(box(/Shop 2/));
    await user.keyboard("{Shift>}");
    await user.click(box(/Shop 4/));
    await user.keyboard("{/Shift}");
    expect(checked()).toEqual([
      "Select Nov 12, 2026, Shop 2, -€2.50",
      "Select Nov 13, 2026, Shop 3, -€3.50",
      "Select Nov 14, 2026, Shop 4, -€4.50",
    ]);

    await user.keyboard("{Shift>}");
    await user.click(box(/Shop 3/));
    await user.keyboard("{/Shift}");
    expect(checked()).toEqual(["Select Nov 12, 2026, Shop 2, -€2.50"]);
  });

  it("selects every row from the header, then none", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(box(/Shop 5/));

    await user.click(box("Select all Pending rows"));
    expect(checked()).toHaveLength(6);

    await user.click(box("Select all Pending rows"));
    expect(checked()).toEqual([]);
  });

  it("names each row's actions after the row", () => {
    render(<Harness section="suspected" />);
    const first = within(screen.getByRole("row", { name: /Shop 1/ }));

    expect(first.getByRole("button", { name: "Keep Nov 11, 2026, Shop 1, -€1.50" })).toBeVisible();
    expect(
      first.getByRole("button", { name: "Discard Nov 11, 2026, Shop 1, -€1.50" }),
    ).toBeVisible();
  });
});

describe("the Resembles box", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("shows the earlier row, marking what differs in text", () => {
    const suspected = row(1, {
      state: "SUSPECTED_DUPLICATE",
      description: "Shell Station 42",
      resembles: {
        imported_transaction_id: "earlier",
        statement_import_id: "import-0",
        state: "ACCEPTED",
        booking_date: "2026-11-11",
        amount: { amount: "-1.50", currency: "EUR" },
        description: "Shell",
      },
    });
    render(
      <ReviewTable
        section="suspected"
        rows={[suspected]}
        selected={new Set()}
        onSelectionChange={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "Resembles: Nov 11, 2026 · Shell (differs) · -€1.50 · Accepted",
      ),
    ).toBeInTheDocument();
  });

  it("names every state the contract lists", () => {
    expect([...importedStates].sort()).toEqual(extensibleEnum("ImportedTransaction").sort());
  });
});
