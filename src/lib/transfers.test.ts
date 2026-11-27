import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../app/i18n";
import { isInTransit, isTransferLeg, transferLabel } from "./transfers";

beforeAll(async () => {
  await initI18n();
});

describe("transferLabel", () => {
  const t = i18next.getFixedT("en", "common");

  it("names money out as a Transfer to the Counterpart", () => {
    expect(transferLabel(t, "out", "Bank")).toBe("Transfer to Bank");
  });

  it("names money in as a Transfer from the Counterpart", () => {
    expect(transferLabel(t, "in", "Bank")).toBe("Transfer from Bank");
  });

  it("names neither way while there's no amount", () => {
    expect(transferLabel(t, undefined, "Bank")).toBe("Transfer · Bank");
  });
});

describe("legs", () => {
  const leg = { counterpart_account_id: "bank" };

  it("is a leg when it names a Counterpart Account", () => {
    expect(isTransferLeg(leg)).toBe(true);
    expect(isTransferLeg({})).toBe(false);
  });

  it("is In transit until it's Matched", () => {
    expect(isInTransit(leg)).toBe(true);
    expect(isInTransit({ ...leg, match_id: "match" })).toBe(false);
  });

  it("isn't In transit once reversed, nor as a reversal", () => {
    expect(isInTransit({ ...leg, reversed_by_transaction_id: "reversal" })).toBe(false);
    expect(isInTransit({ ...leg, reversal_of_transaction_id: "original" })).toBe(false);
  });

  it("is never In transit when it isn't a leg", () => {
    expect(isInTransit({})).toBe(false);
  });
});
