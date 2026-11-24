// Facts read from the pinned contract (src/api/openapi.yaml), for tests that
// check the UI's own lists against it. A blank line inside a schema or a
// property (between paragraphs of a description) doesn't end it.
import contract from "../api/openapi.yaml?raw";

/**
 * The values of the first `x-extensible-enum` in a component schema: `AccountKind`'s
 * own, or `StatementImport`'s `balance_check`.
 */
export function extensibleEnum(schema: string): string[] {
  const block = new RegExp(`\\n {4}${schema}:\\n((?: {6,}.*\\n|\\n)+)`).exec(contract)?.[1];
  const list =
    block === undefined ? undefined : /x-extensible-enum:\n((?: {8,}- .*\n)+)/.exec(block)?.[1];
  if (list === undefined) {
    throw new Error(`No x-extensible-enum for ${schema} in the contract`);
  }
  return list
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*- /, "").trim());
}

/** A YAML scalar as written in the contract: plain, 'single' or "double" quoted. */
function scalar(text: string): string {
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replaceAll("''", "'");
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    return JSON.parse(text) as string;
  }
  return text;
}

/** The `x-extensible-enum` values of one property of a component schema, such as `CsvMapping`'s `date_format`. */
export function propertyEnum(schema: string, property: string): string[] {
  const block = new RegExp(`\\n {4}${schema}:\\n((?: {6,}.*\\n|\\n)+)`).exec(contract)?.[1];
  const field =
    block === undefined
      ? undefined
      : new RegExp(`(?:^|\\n) {8}${property}:\\n((?: {10,}.*\\n|\\n)+)`).exec(block)?.[1];
  const list =
    field === undefined ? undefined : /x-extensible-enum:\n((?: {12,}- .*\n)+)/.exec(field)?.[1];
  if (list === undefined) {
    throw new Error(`No x-extensible-enum for ${schema}.${property} in the contract`);
  }
  return list
    .trimEnd()
    .split("\n")
    .map((line) => scalar(line.replace(/^\s*- /, "").trim()));
}
