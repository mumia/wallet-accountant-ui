// JSON source text access (ES2026, Baseline 2025): TypeScript 6's lib doesn't
// declare it yet. Remove this file when it does.

interface RawJSON {
  readonly rawJSON: string;
}

interface JSONReviverContext {
  /** The value's source text; present only for primitive values. */
  readonly source?: string;
}

interface JSON {
  parse(
    text: string,
    reviver: (this: unknown, key: string, value: unknown, context: JSONReviverContext) => unknown,
  ): unknown;
  rawJSON(text: string): RawJSON;
  isRawJSON(value: unknown): value is RawJSON;
}
