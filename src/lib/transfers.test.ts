import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";

import { initI18n } from "../app/i18n";
import {
  canTakeLegOn,
  isInTransit,
  isTransferLeg,
  reverseWarning,
  transferLabel,
} from "./transfers";

beforeAll(async () => {
  await initI18n();
});

describe("canTakeLegOn", () => {
  const wallet = { kind: "CASH", start_date: "2026-11-27" } as const;

  it("refuses a cash leg before the cash Account's start date", () => {
    expect(canTakeLegOn(wallet, "2026-11-02")).toBe(false);
  });

  it("takes a cash leg on the start date and after it", () => {
    expect(canTakeLegOn(wallet, "2026-11-27")).toBe(true);
    expect(canTakeLegOn(wallet, "2026-11-28")).toBe(true);
  });

  it("takes any date on a statement Account, whose leg is In transit", () => {
    expect(canTakeLegOn({ kind: "BANK_ACCOUNT", start_date: "2026-11-27" }, "2026-11-02")).toBe(
      true,
    );
  });
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

describe("reverseWarning", () => {
  const bank = { kind: "BANK_ACCOUNT" as const, name: "Bank" };
  const wallet = { kind: "CASH" as const, name: "Wallet" };
  const purse = { kind: "CASH" as const, name: "Purse" };
  const matched = { counterpart_account_id: "other", match_id: "match" };
  // What else a leg carries, which doesn't change the warning.
  const accepted = { ...matched, imported_transaction_id: "row" };
  const recordedByAccept = { ...matched, created_by_transfer: true };

  it("warns of the row and the cash leg on a bank leg", () => {
    expect(reverseWarning(accepted, bank, wallet)).toEqual({
      kind: "bankLeg",
      counterpart: "Wallet",
    });
  });

  it("warns that the bank leg stays, on a cash leg an Accept recorded", () => {
    expect(reverseWarning(recordedByAccept, wallet, bank)).toEqual({
      kind: "cashLeg",
      counterpart: "Bank",
    });
  });

  it("warns the same on a cash leg noted by hand", () => {
    expect(reverseWarning(matched, wallet, bank)).toEqual({ kind: "cashLeg", counterpart: "Bank" });
  });

  it("warns that both legs go, on either leg of a cash ↔ cash Transfer", () => {
    expect(reverseWarning(matched, wallet, purse)).toEqual({ kind: "both", counterpart: "Purse" });
    expect(reverseWarning(matched, purse, wallet)).toEqual({ kind: "both", counterpart: "Wallet" });
  });

  it("doesn't warn on a leg In transit", () => {
    expect(reverseWarning({ counterpart_account_id: "other" }, wallet, bank)).toEqual({
      kind: "none",
    });
    expect(reverseWarning({ counterpart_account_id: "other" }, bank, wallet)).toEqual({
      kind: "none",
    });
  });

  it("doesn't warn on a Transaction that isn't a leg, nor before the Counterpart is known", () => {
    expect(reverseWarning({}, wallet, undefined)).toEqual({ kind: "none" });
    expect(reverseWarning(matched, wallet, undefined)).toEqual({ kind: "none" });
  });
});
