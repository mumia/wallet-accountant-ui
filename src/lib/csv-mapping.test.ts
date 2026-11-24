import { describe, expect, it } from "vitest";

import { propertyEnum } from "../test/contract";
import {
  choices,
  csvMapping,
  freeConnectionName,
  mappingForm,
  mappingSchema,
  newMappingForm,
  rekeyColumns,
  sameMapping,
  type ColumnField,
  type CsvMapping,
  type MappingForm,
} from "./csv-mapping";

describe("the mapping's choices", () => {
  it.each([
    "encoding",
    "date_format",
    "decimal_separator",
    "thousands_separator",
    "amount_layout",
    "positive_amount_means",
  ] as const)("offer every %s the contract lists", (choice) => {
    expect([...choices[choice]].sort()).toEqual(propertyEnum("CsvMapping", choice).sort());
  });
});

const saved: CsvMapping = {
  encoding: "UTF_8",
  delimiter: ";",
  has_header_row: true,
  skip_leading_lines: 0,
  skip_trailing_lines: 2,
  date_format: "YYYY-MM-DD",
  decimal_separator: ".",
  thousands_separator: "",
  amount_layout: "SIGNED",
  positive_amount_means: "MONEY_IN",
  columns: {
    booking_date: { header: "Date" },
    description: { header: "Description" },
    amount: { header: "Amount" },
    bank_transaction_id: { position: 4 },
  },
};

describe("reading and writing a mapping", () => {
  it("writes back what it read", () => {
    expect(csvMapping(mappingForm("ING", saved))).toEqual(saved);
  });

  it("keeps values the UI doesn't know", () => {
    const unknown = { ...saved, date_format: "YYYY.MM.DD", encoding: "UTF_16" };
    expect(csvMapping(mappingForm("ING", unknown))).toEqual(unknown);
  });

  it("writes only the columns and sign the layout reads", () => {
    const form: MappingForm = {
      ...newMappingForm("x"),
      amountLayout: "DEBIT_CREDIT",
      columns: { ...newMappingForm("x").columns, amount: "p:3", debit: "p:4", credit: "p:5" },
    };
    const mapping = csvMapping(form);
    expect(mapping.columns).toEqual({ debit: { position: 4 }, credit: { position: 5 } });
    expect(mapping.positive_amount_means).toBeUndefined();
  });

  it("tells a changed mapping from a renamed one", () => {
    const form = mappingForm("ING", saved);
    expect(sameMapping(form, { ...form, name: "Other" })).toBe(true);
    expect(sameMapping(form, { ...form, delimiter: "," })).toBe(false);
  });
});

describe("moving picks with the header row", () => {
  const columns = { ...newMappingForm("x").columns, booking_date: "h:Date", amount: "p:3" };

  it("turns header names into positions without a header row", () => {
    expect(rekeyColumns(columns, ["Date", "Text", "Amount"], false)).toMatchObject({
      booking_date: "p:1",
      amount: "p:3",
    });
  });

  it("turns positions into header names with one", () => {
    expect(rekeyColumns(columns, ["Date", "Text", "Amount"], true)).toMatchObject({
      booking_date: "h:Date",
      amount: "h:Amount",
    });
  });
});

describe("a new Connection's name", () => {
  it("takes the first free one", () => {
    expect(freeConnectionName("Statement file", [])).toBe("Statement file");
    expect(freeConnectionName("Statement file", ["statement FILE", "Statement file 2"])).toBe(
      "Statement file 3",
    );
  });
});

describe("the mapping rules", () => {
  const schema = mappingSchema(
    (key) => key,
    (other: ColumnField) => `also ${other}`,
  );
  const valid: MappingForm = mappingForm("ING", saved);
  const errors = (form: MappingForm) => {
    const result = schema.safeParse(form);
    return result.success
      ? {}
      : Object.fromEntries(
          result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
        );
  };

  it("accept a valid mapping", () => {
    expect(errors(valid)).toEqual({});
  });

  it("need a name of at most 100 characters", () => {
    expect(errors({ ...valid, name: "  " })).toEqual({ name: "rules.nameRequired" });
    expect(errors({ ...valid, name: "x".repeat(101) })).toEqual({ name: "rules.nameTooLong" });
  });

  it("need the columns the amount layout reads", () => {
    const columns = { ...valid.columns, amount: "" };
    expect(errors({ ...valid, columns })).toEqual({ "columns.amount": "rules.columnRequired" });
    expect(errors({ ...valid, amountLayout: "DEBIT_CREDIT" })).toEqual({
      "columns.debit": "rules.columnRequired",
      "columns.credit": "rules.columnRequired",
    });
  });

  it("refuse a column used twice, by header ignoring case or by position", () => {
    expect(errors({ ...valid, columns: { ...valid.columns, description: "h:date" } })).toEqual({
      "columns.description": "also booking_date",
    });
    expect(errors({ ...valid, columns: { ...valid.columns, payee: "p:4" } })).toEqual({
      "columns.bank_transaction_id": "also payee",
    });
  });

  it("refuse a header column without a header row", () => {
    expect(errors({ ...valid, hasHeaderRow: false })).toEqual({
      "columns.booking_date": "rules.headerWithoutHeaderRow",
      "columns.description": "rules.headerWithoutHeaderRow",
      "columns.amount": "rules.headerWithoutHeaderRow",
    });
  });

  it("refuse equal separators", () => {
    expect(errors({ ...valid, thousandsSeparator: "." })).toEqual({
      thousandsSeparator: "rules.separatorsEqual",
    });
  });

  it("need one delimiter character, lines to skip, a date format and a sign", () => {
    expect(
      errors({
        ...valid,
        delimiter: ";;",
        skipLeadingLines: "-1",
        skipTrailingLines: "x",
        dateFormat: "",
        positiveAmountMeans: "",
      }),
    ).toEqual({
      delimiter: "rules.delimiter",
      skipLeadingLines: "rules.skipLeadingLines",
      skipTrailingLines: "rules.skipTrailingLines",
      dateFormat: "rules.dateFormat",
      positiveAmountMeans: "rules.positiveAmountMeans",
    });
  });
});
