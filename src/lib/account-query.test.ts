import { describe, expect, it } from "vitest";

import { canCorrectOpeningCount } from "./account-query";

describe("canCorrectOpeningCount", () => {
  it.each([
    ["a cash Account in its start month", "CASH", "2026-11", true],
    ["a cash Account once its start month closed", "CASH", "2026-12", false],
    ["a statement Account in its start month", "BANK_ACCOUNT", "2026-11", false],
  ] as const)("%s: %s", (_, kind, openMonth, expected) => {
    expect(canCorrectOpeningCount({ kind, start_date: "2026-11-26", open_month: openMonth })).toBe(
      expected,
    );
  });
});
