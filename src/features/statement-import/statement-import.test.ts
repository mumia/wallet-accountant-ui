import { describe, expect, it } from "vitest";

import { resources } from "../../app/i18n";
import { extensibleEnum } from "../../test/contract";
import { refusalShape } from "./refusal";
import { balanceChecks } from "./result-step";

const problem = { type: "/problems/whatever", title: "Refused", status: 422 };
const eur = (amount: string) => ({ amount, currency: "EUR" });

describe("a refused statement is read by its fields, never its type", () => {
  it("lists unreadable lines", () => {
    const rows = [{ line: 7, reason: 'the amount "x" is not a number' }];

    expect(refusalShape({ ...problem, rows })).toEqual({ kind: "rows", rows });
  });

  it("gives a failed Balance check's three amounts", () => {
    expect(
      refusalShape({
        ...problem,
        expected_balance: eur("100.00"),
        export_balance: eur("90.00"),
        difference: eur("-10.00"),
      }),
    ).toEqual({
      kind: "balance",
      expected: eur("100.00"),
      exportBalance: eur("90.00"),
      difference: eur("-10.00"),
    });
  });

  it("links an earlier import of the same file", () => {
    expect(refusalShape({ ...problem, status: 409, statement_import_id: "abc" })).toEqual({
      kind: "earlier-import",
      statementImportId: "abc",
    });
  });

  it("shows anything else as its title and detail", () => {
    expect(refusalShape({ ...problem, detail: "No." })).toEqual({ kind: "plain" });
    expect(refusalShape({ ...problem, rows: [] })).toEqual({ kind: "plain" });
    expect(refusalShape({ ...problem, expected_balance: eur("1.00") })).toEqual({ kind: "plain" });
    expect(refusalShape(new TypeError("offline"))).toEqual({ kind: "plain" });
  });
});

describe("the Balance check", () => {
  it("names every value the contract lists", () => {
    expect([...balanceChecks].sort()).toEqual(extensibleEnum("StatementImport").sort());
    expect(Object.keys(resources.en.statementImport.result.checks).sort()).toEqual(
      [...balanceChecks].sort(),
    );
  });
});
