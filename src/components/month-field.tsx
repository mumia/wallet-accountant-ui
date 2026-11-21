import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { addMonths, formatMonth, type Month, type MonthChoice } from "../lib/month";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export type { MonthChoice };

/**
 * The month field (spec, "To review" and "Transactions"): previous and next
 * arrows around a choice of the offered months and "All months".
 */
export function MonthField({
  value,
  months,
  onValueChange,
}: {
  value: MonthChoice;
  /** The months to offer, newest first. */
  months: readonly Month[];
  onValueChange: (value: MonthChoice) => void;
}) {
  const { t } = useTranslation();
  const labelId = useId();
  const valueId = useId();
  const items = [
    { value: "all", label: t("monthField.all") },
    ...months.map((month) => ({ value: month, label: formatMonth(month) })),
  ];
  const step = (count: number) => {
    if (value === "all") {
      return undefined;
    }
    const next = addMonths(value, count);
    return months.includes(next) ? next : undefined;
  };
  const previous = step(-1);
  const next = step(1);

  return (
    <div role="group" aria-labelledby={labelId} className="flex items-center gap-1">
      <span id={labelId} className="sr-only">
        {t("monthField.label")}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("monthField.previous")}
        disabled={previous === undefined}
        onClick={() => {
          if (previous !== undefined) {
            onValueChange(previous);
          }
        }}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <Select
        items={items}
        value={value}
        onValueChange={(choice: string | null) => {
          if (choice !== null) {
            onValueChange(choice as MonthChoice);
          }
        }}
      >
        {/* Named "Month, March 2026": the shown month is part of its name (WCAG 2.5.3). */}
        <SelectTrigger aria-labelledby={`${labelId} ${valueId}`} className="min-w-44">
          <SelectValue id={valueId} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("monthField.next")}
        disabled={next === undefined}
        onClick={() => {
          if (next !== undefined) {
            onValueChange(next);
          }
        }}
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
