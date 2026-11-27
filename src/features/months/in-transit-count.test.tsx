import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../../app/i18n";
import { InTransitCount } from "./in-transit-count";

beforeAll(async () => {
  await initI18n();
});

function renderCount(count: number) {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <>
          <h1>Month</h1>
          <InTransitCount householdId="home" accountId="wallet" month="2026-11" count={count} />
        </>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("InTransitCount", () => {
  it("says how many Transfer legs are In transit, linking to them", async () => {
    renderCount(3);

    const link = await screen.findByRole("link", { name: "3 Transfer legs In transit" });
    expect(link).toHaveAttribute(
      "href",
      "/households/home/accounts/wallet/transactions?booking_month=2026-11&in_transit=true",
    );
  });

  it("names one leg in the singular", async () => {
    renderCount(1);

    expect(await screen.findByText("1 Transfer leg In transit")).toBeInTheDocument();
  });

  it("shows nothing when none are In transit", async () => {
    renderCount(0);

    await screen.findByRole("heading", { name: "Month" });
    expect(screen.queryByText(/In transit/)).not.toBeInTheDocument();
  });
});
