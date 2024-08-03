import { euroFormatter } from "../config/stringHelper";

type Props = {
  value: number,
  currency: string,
  negative?: boolean,
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
  let symbol = '';

  if (negative === null) {
    negative = value < 0;
  }

  if (negative) {
    symbol = "-";
  } else if (showPositiveSymbol) {
    symbol = "+";
  }

  value = Math.abs(value);

  return (
    <span className={symbol === "-" ? "negative" : "positive"}>
      {symbol}{euroFormatter(value)} {currency}
    </span>
  );
}