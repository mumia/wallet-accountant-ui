import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../../app/i18n";
import { InTransitCount } from "./in-transit-count";

beforeAll(async () => {
  await initI18n();
});

describe("InTransitCount", () => {
  it("says how many Transfer legs are In transit", () => {
    render(<InTransitCount count={3} />);

    expect(screen.getByText("3 Transfer legs In transit")).toBeInTheDocument();
  });

  it("names one leg in the singular", () => {
    render(<InTransitCount count={1} />);

    expect(screen.getByText("1 Transfer leg In transit")).toBeInTheDocument();
  });

  it("shows nothing when none are In transit", () => {
    const { container } = render(<InTransitCount count={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
