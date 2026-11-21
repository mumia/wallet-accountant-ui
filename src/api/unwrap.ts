/**
 * The body of an openapi-fetch result, or its error thrown. Errors are thrown
 * as the problem itself, as openapi-react-query's hooks throw them, so
 * `isProblem`, `errorStatus` and the retry rules see the same thing either way.
 */
export function unwrap<T>({ data, error }: { data?: T; error?: unknown }): T {
  if (data !== undefined) {
    return data;
  }
  throw error;
}
