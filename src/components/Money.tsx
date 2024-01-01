import { convertCurrencyToSymbol } from "../config/stringHelper";

type Props = {
  value: number,
  currency: string,
  negative: boolean,
  showPositiveSymbol?: boolean
};

export default function Money(
  {
    value,
    currency,
    negative,
    showPositiveSymbol
  }: Props
) {
  let symbol = '\u00A0';

  if (negative) {
    symbol = "-";
  } else if (showPositiveSymbol) {
    symbol = "+";
  }

  value = Math.abs(value);

  return (
    <span className={symbol === "-" ? "negative" : "positive"}>
      {symbol}{convertCurrencyToSymbol(currency)}{value}
    </span>
  );
}