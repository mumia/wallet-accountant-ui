// Facts read from the pinned contract (src/api/openapi.yaml), for tests that
// check the UI's own lists against it.
import contract from "../api/openapi.yaml?raw";

/** The values of a component schema's `x-extensible-enum`, such as `AccountKind`'s. */
export function extensibleEnum(schema: string): string[] {
  const block = new RegExp(`\\n {4}${schema}:\\n((?: {6,}.*\\n)+)`).exec(contract)?.[1];
  const list =
    block === undefined ? undefined : /x-extensible-enum:\n((?: {8}- .*\n)+)/.exec(block)?.[1];
  if (list === undefined) {
    throw new Error(`No x-extensible-enum for ${schema} in the contract`);
  }
  return list
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*- /, "").trim());
}
