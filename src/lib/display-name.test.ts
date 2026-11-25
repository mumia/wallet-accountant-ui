import { describe, expect, it } from "vitest";

import { displayNameSchema } from "./display-name";

const schema = displayNameSchema({ required: "required", tooLong: "too long" });

const firstMessage = (value: string) => schema.safeParse(value).error?.issues[0]?.message;

describe("displayNameSchema", () => {
  it("trims the name", () => {
    expect(schema.parse("  Ana  ")).toBe("Ana");
  });

  it.each(["", "   "])("refuses %j as required", (value) => {
    expect(firstMessage(value)).toBe("required");
  });

  it("takes 64 characters, after trimming", () => {
    expect(schema.parse(` ${"x".repeat(64)} `)).toBe("x".repeat(64));
  });

  it("refuses 65 characters", () => {
    expect(firstMessage("x".repeat(65))).toBe("too long");
  });
});
