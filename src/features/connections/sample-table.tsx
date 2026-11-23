import { ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import type { ColumnField, ColumnKey } from "../../lib/csv-mapping";
import type { SampleTable as Sample } from "../../lib/csv-sample";

const unused = "";

/**
 * The sample file as a table (spec, "CSV mapping editor"). Each column's
 * button says what it holds and picks that from a menu: the User picks a
 * column, never a header name or a position.
 */
export function SampleTable({
  fileName,
  table,
  fields,
  picks,
  keyOf,
  onPick,
}: {
  fileName: string;
  table: Sample;
  /** The fields a column can hold with the current amount layout. */
  fields: readonly ColumnField[];
  /** What each field reads now. */
  picks: Record<ColumnField, ColumnKey>;
  /** The key that names the column at `index` (from 0). */
  keyOf: (index: number) => ColumnKey;
  /** Picks the column at `index` for `field`, or for nothing. */
  onPick: (index: number, field: ColumnField | undefined) => void;
}) {
  const { t } = useTranslation("connections");
  const columns = Array.from({ length: table.width }, (_, index) => index);
  const fieldAt = (index: number) => fields.find((field) => picks[field] === keyOf(index));

  if (table.rows.length === 0 && table.header === undefined) {
    return <p className="text-sm text-muted-foreground">{t("sample.empty")}</p>;
  }

  return (
    <div className="max-h-96 max-w-full overflow-auto rounded-lg border">
      <Table>
        <TableCaption className="sr-only">
          {t("sample.tableCaption", { name: fileName })}
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((index) => {
              const field = fieldAt(index);
              const number = index + 1;
              const header = table.header?.[index]?.trim() ?? "";
              return (
                <TableHead key={index} className="h-auto py-2 align-top">
                  <div className="grid gap-1">
                    <span className="text-xs font-normal text-muted-foreground">
                      {header === ""
                        ? t("sample.column", { number })
                        : t("sample.columnWithHeader", { number, header })}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant={field === undefined ? "outline" : "secondary"}
                            size="sm"
                            className="justify-between gap-2"
                            aria-label={`${t("sample.pick", { number })}: ${
                              field === undefined ? t("sample.unused") : t(`fields.${field}`)
                            }`}
                          />
                        }
                      >
                        {field === undefined ? t("sample.unused") : t(`fields.${field}`)}
                        <ChevronDownIcon aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-auto">
                        <DropdownMenuRadioGroup
                          value={field ?? unused}
                          onValueChange={(value: string) => {
                            onPick(
                              index,
                              value === unused
                                ? undefined
                                : fields.find((candidate) => candidate === value),
                            );
                          }}
                        >
                          <DropdownMenuRadioItem value={unused} closeOnClick>
                            {t("sample.unused")}
                          </DropdownMenuRadioItem>
                          {fields.map((candidate) => (
                            <DropdownMenuRadioItem key={candidate} value={candidate} closeOnClick>
                              {t(`fields.${candidate}`)}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((index) => (
                <TableCell key={index} className="max-w-64 truncate">
                  {row[index] ?? ""}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
