/**
 * A currency's name in the User's locale ("Euro"), or undefined when `Intl`
 * doesn't know the code (crypto such as ETH).
 */
export function currencyName(code: string, locale?: string): string | undefined {
  try {
    return new Intl.DisplayNames(locale, { type: "currency", fallback: "none" }).of(code);
  } catch {
    // Not a well-formed currency code for Intl, such as a five-letter one.
    return undefined;
  }
}
