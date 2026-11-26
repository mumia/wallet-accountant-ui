import { useMemo, type Ref } from "react";
import { useTranslation } from "react-i18next";

import {
  fitsSign,
  flattenCategories,
  isUncategorised,
  type AmountSign,
  type CategoryNode,
} from "../lib/categories";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "./ui/combobox";

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();

/** Every word typed appears somewhere in the path: "food gro" finds "Food › Groceries". */
function matchesPath(option: PickerOption, query: string): boolean {
  const path = fold(option.label);
  return fold(query)
    .split(/\s+/)
    .every((word) => path.includes(word));
}

/** The value of the "Top level" option, for moving a Category to the root. */
export const topLevel = "top-level";

const kindGroups = ["EXPENSE", "INCOME"] as const;
type KindGroup = (typeof kindGroups)[number];

interface PickerOption {
  value: string;
  /** The full path, "Food › Groceries": what is searched and what the input shows. */
  label: string;
  /** The ancestors' part of the path, read out but not shown: "Food › ". */
  ancestors: string;
  name: string;
  depth: number;
}

interface PickerGroup {
  value: string;
  label: string | undefined;
  items: PickerOption[];
}

interface CategoryPickerProps {
  id: string;
  /** The Household's Category tree, from `GET …/categories`. */
  categories: readonly CategoryNode[];
  /** A Category ID, `topLevel`, or null for none. */
  value: string | null;
  onValueChange: (value: string | null) => void;
  /** Which kinds to offer, in this order after Uncategorised; both by default. */
  kinds?: readonly KindGroup[];
  /**
   * The amount's sign (spec, "The sign rule"): Expense Categories are offered
   * only for money out, Income ones only for money in. None filters nothing.
   */
  sign?: AmountSign | undefined;
  /** Whether to offer Uncategorised first; true by default. */
  includeUncategorised?: boolean;
  /** Categories not to offer, such as one being moved and its sub-Categories. */
  exclude?: ReadonlySet<string>;
  /** Offers a first option with this label and the value `topLevel`. */
  topLevelLabel?: string;
  /**
   * What names it: a visible label's ID, or a name of its own (a row's picker).
   * A label's `htmlFor` alone isn't enough: while the list is open Base UI
   * hides the rest of the page, label included, and the input loses its name
   * (Base UI #6275); `aria-labelledby` still names it.
   */
  label: { id: string } | { text: string };
  onBlur?: () => void;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
}

/**
 * The Category picker (spec, "Accessibility"): every Category an indented
 * option, searchable by its full path ("Food › Groceries"), grouped as
 * Uncategorised, then Expense, then Income. Parents can be picked; Internal
 * Categories other than Uncategorised are never offered. Given the amount's
 * sign, it offers only the kind that fits it.
 */
export function CategoryPicker({
  id,
  categories,
  value,
  onValueChange,
  kinds = kindGroups,
  sign,
  includeUncategorised = true,
  exclude,
  topLevelLabel,
  label,
  onBlur,
  name,
  inputRef,
  disabled,
  ...aria
}: CategoryPickerProps) {
  const { t } = useTranslation();

  const { groups, all } = useMemo(() => {
    const every = flattenCategories(categories);
    const flat = every.filter(({ id: category }) => !exclude?.has(category));
    const option = (category: (typeof flat)[number]): PickerOption => ({
      value: category.id,
      label: category.path.join(" › "),
      ancestors: category.path
        .slice(0, -1)
        .map((part) => `${part} › `)
        .join(""),
      name: category.name,
      depth: category.depth,
    });
    const result: PickerGroup[] = [];
    const first: PickerOption[] = [];
    const top: PickerOption | undefined =
      topLevelLabel === undefined
        ? undefined
        : { value: topLevel, label: topLevelLabel, ancestors: "", name: topLevelLabel, depth: 0 };
    if (top !== undefined) {
      first.push(top);
    }
    if (includeUncategorised) {
      first.push(...flat.filter(isUncategorised).map(option));
    }
    if (first.length > 0) {
      result.push({ value: "first", label: undefined, items: first });
    }
    for (const kind of kinds) {
      const items = flat
        .filter((category) => category.kind === kind && fitsSign(category, sign))
        .map(option);
      if (items.length > 0) {
        result.push({ value: kind, label: t(`categoryPicker.kinds.${kind}`), items });
      }
    }
    // A Category that isn't offered, such as one breaking the sign rule, still shows.
    return { groups: result, all: [...(top === undefined ? [] : [top]), ...every.map(option)] };
  }, [categories, exclude, includeUncategorised, kinds, sign, t, topLevelLabel]);

  const selected = all.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      items={groups}
      value={selected}
      onValueChange={(option: PickerOption | null) => {
        onValueChange(option?.value ?? null);
      }}
      itemToStringLabel={(option: PickerOption) => option.label}
      filter={(option: PickerOption, query: string) => matchesPath(option, query)}
      isItemEqualToValue={(a: PickerOption, b: PickerOption) => a.value === b.value}
      {...(disabled === undefined ? {} : { disabled })}
    >
      <ComboboxInput
        id={id}
        ref={inputRef}
        name={name}
        onBlur={onBlur}
        placeholder={t("categoryPicker.placeholder")}
        {...("id" in label ? { "aria-labelledby": label.id } : { "aria-label": label.text })}
        {...aria}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("categoryPicker.noMatch")}</ComboboxEmpty>
        <ComboboxList>
          {(group: PickerGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              {group.label !== undefined && <ComboboxLabel>{group.label}</ComboboxLabel>}
              <ComboboxCollection>
                {(option: PickerOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    <span style={{ paddingInlineStart: `${String(option.depth)}rem` }}>
                      {option.ancestors !== "" && (
                        <span className="sr-only">{option.ancestors}</span>
                      )}
                      {option.name}
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
