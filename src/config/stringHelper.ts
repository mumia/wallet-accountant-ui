export function capitalizeFirstLetter(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function padValue(value: string | number) {
  return String(value).padStart(2, "0");
}

export function convertCurrencyToSymbol(currency: string) {
  switch (currency) {
    case "EUR":
      return "\u20AC";
    case "USD":
      return "$";
    case "CHF":
      return "\u20A3";
  }

  return "";
}
