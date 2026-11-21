import { CalendarIcon } from "lucide-react";
import { useRef, useState, type Ref } from "react";
import { useTranslation } from "react-i18next";

import { formatDate, fromIsoDate, parseDateInput, toIsoDate, type IsoDate } from "../lib/date";
import { Calendar } from "./ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface DateInputProps {
  id: string;
  /** The date, or null while the field holds none or text that isn't a date. */
  value: IsoDate | null;
  onValueChange: (value: IsoDate | null) => void;
  onBlur?: () => void;
  /** The latest date the calendar offers; typing a later one is the form's to refuse. */
  max?: IsoDate;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
  /** For tests; the User's locale otherwise. */
  locale?: string;
}

/**
 * A date typed in the User's locale (`11/01/2026` in en-US), or picked from a
 * calendar popover (spec, "Add Account"). Like the amount input, it formats
 * only when it loses focus, so the caret never moves while typing.
 */
export function DateInput({
  id,
  value,
  onValueChange,
  onBlur,
  max,
  name,
  inputRef,
  locale,
  ...aria
}: DateInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(() => (value === null ? "" : formatDate(value, locale)));
  // The value the text last stood for: when the form or the calendar changes
  // `value`, the text follows.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (parseDateInput(text, locale) !== (value ?? undefined)) {
      setText(value === null ? "" : formatDate(value, locale));
    }
  }

  const selected = value === null ? undefined : fromIsoDate(value);
  const dayLabel = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        name={name}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={text}
        {...aria}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const date = parseDateInput(next, locale) ?? null;
          setShown(date);
          onValueChange(date);
        }}
        onBlur={() => {
          if (value !== null) {
            setText(formatDate(value, locale));
          }
          onBlur?.();
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<InputGroupButton size="icon-xs" aria-label={t("dateInput.choose")} />}
          >
            <CalendarIcon aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="end"
            // The chosen day, else today, as the APG date picker dialog does.
            initialFocus={() =>
              calendarRef.current?.querySelector<HTMLElement>(
                "button[data-selected-single=true]",
              ) ??
              calendarRef.current?.querySelector<HTMLElement>("[data-today] button") ??
              true
            }
          >
            <div ref={calendarRef}>
              <Calendar
                mode="single"
                // Picking the chosen day again keeps it, rather than clearing the field.
                required={selected !== undefined}
                // The User just opened the calendar: focus goes to the chosen
                // day, as the APG date picker dialog pattern does.
                // eslint-disable-next-line jsx-a11y/no-autofocus -- see above
                autoFocus
                selected={selected}
                // "Sunday, November 1, 2026" holds the "1" the button shows (WCAG
                // 2.5.3); react-day-picker's "November 1st" doesn't.
                labels={{
                  labelDayButton: (date, modifiers) => {
                    const day = dayLabel.format(date);
                    return modifiers["today"] === true ? t("dateInput.today", { day }) : day;
                  },
                }}
                {...(selected === undefined ? {} : { defaultMonth: selected })}
                {...(max === undefined ? {} : { disabled: { after: fromIsoDate(max) } })}
                onSelect={(date: Date | undefined) => {
                  if (date !== undefined) {
                    onValueChange(toIsoDate(date));
                  }
                  setOpen(false);
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
