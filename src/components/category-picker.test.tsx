import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../app/i18n";
import { categoryTree } from "../test/categories";
import { CategoryPicker, topLevel } from "./category-picker";

function Harness(props: Partial<Parameters<typeof CategoryPicker>[0]>) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <label id="category-label" htmlFor="category">
        Category
      </label>
      <CategoryPicker
        id="category"
        categories={categoryTree}
        label={{ id: "category-label" }}
        value={value}
        onValueChange={setValue}
        {...props}
      />
      <output>{value ?? "none"}</output>
    </>
  );
}

const picker = () => screen.getByRole("combobox", { name: "Category" });
const optionNames = () => screen.getAllByRole("option").map((option) => option.textContent);

describe("CategoryPicker", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("offers Uncategorised, then Expense, then Income, with Internal ones hidden", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(picker());

    expect(optionNames()).toEqual([
      "Uncategorised",
      "Food",
      "Food › Eating out",
      "Food › Eating out › Coffee",
      "Food › Groceries",
      "Transport",
      "Salary",
    ]);
    expect(
      within(screen.getByRole("group", { name: "Expense" })).getAllByRole("option"),
    ).toHaveLength(5);
    expect(
      within(screen.getByRole("group", { name: "Income" })).getByRole("option"),
    ).toHaveTextContent("Salary");
    // Base UI #6275: the input keeps its name while the list is open.
    expect(picker()).toHaveAccessibleName("Category");
  });

  it("searches by full path and picks by keyboard alone", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(picker()).toHaveFocus();
    await user.keyboard("food gro");
    expect(optionNames()).toEqual(["Food › Groceries"]);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("groceries");
    expect(picker()).toHaveValue("Food › Groceries");
  });

  it("can pick a parent Category", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(picker(), "Food");
    await user.click(screen.getByRole("option", { name: "Food" }));

    expect(screen.getByRole("status")).toHaveTextContent("food");
  });

  it("limits the kinds, excludes Categories and offers Top level, for Move", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        kinds={["EXPENSE"]}
        includeUncategorised={false}
        exclude={new Set(["eating-out", "coffee"])}
        topLevelLabel="Top level"
      />,
    );

    await user.click(picker());
    expect(optionNames()).toEqual(["Top level", "Food", "Food › Groceries", "Transport"]);
    await user.click(screen.getByRole("option", { name: "Top level" }));

    expect(screen.getByRole("status")).toHaveTextContent(topLevel);
  });
});
