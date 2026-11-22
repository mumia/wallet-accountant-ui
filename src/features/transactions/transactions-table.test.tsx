import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { createApi } from "../../api/client";
import { ApiContext } from "../../api/context";
import { initI18n } from "../../app/i18n";
import { Toaster } from "../../components/toaster";
import { categoryTree } from "../../test/categories";
import { TransactionsTable } from "./transactions-table";
import type { AccountTransaction } from "./transactions-query";

function transaction(n: number, extra: Partial<AccountTransaction> = {}): AccountTransaction {
  return {
    transaction_id: `transaction-${String(n)}`,
    amount: { amount: `-${String(n)}.50` as `${number}`, currency: "EUR" },
    booking_date: `2026-11-1${String(n)}`,
    transaction_date: `2026-11-1${String(n)}`,
    description: `Shop ${String(n)}`,
    category_id: "uncategorised",
    category_name: "Uncategorised",
    ...extra,
  };
}

/** Replaces the rows, as a refetch landing does. */
let setRows: (rows: AccountTransaction[]) => void = () => undefined;

function Rows() {
  const [rows, set] = useState([transaction(1), transaction(2)]);
  useEffect(() => {
    setRows = set;
  }, []);
  return (
    <TransactionsTable
      householdId="household-1"
      accountId="account-1"
      transactions={rows}
      categories={categoryTree}
      openMonth="2026-11"
    />
  );
}

function renderTable() {
  const router = createRouter({
    routeTree: createRootRoute({ component: Rows }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <ApiContext value={createApi({ baseUrl: "/api" })}>
      <QueryClientProvider client={new QueryClient()}>
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
      </QueryClientProvider>
    </ApiContext>,
  );
}

describe("the Transaction list", () => {
  beforeAll(async () => {
    await initI18n();
  });

  it("keeps what is typed in a picker when other rows change", async () => {
    const user = userEvent.setup();
    renderTable();
    const picker = await screen.findByRole("combobox", { name: /Shop 2/ });

    await user.clear(picker);
    await user.type(picker, "Trans");
    // Another row's save lands while the User is still typing.
    act(() => {
      setRows([
        transaction(1, { category_id: "transport", category_name: "Transport" }),
        transaction(2),
      ]);
    });

    // The open list hides the rest of the page from the accessibility tree.
    expect(screen.getByRole("combobox", { name: /Shop 1/, hidden: true })).toHaveValue("Transport");
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveFocus();
    expect(picker).toHaveValue("Trans");
  });
});
