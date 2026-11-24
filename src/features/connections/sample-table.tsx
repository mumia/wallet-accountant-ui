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
import { firstReadRow, type SampleTable as Sample } from "../../lib/csv-sample";
import { GapRow } from "./gap-row";

const unused = "";

/**
 * The sample file as a table (spec, "CSV mapping editor"). Each column's
 * button says what it holds and picks that from a menu: the User picks a
 * column, never a header name or a position. Each line has its number in the
 * file; the first and last rows are shown, with a gap for those between, and
 * lines skipped at the top or bottom are dimmed and marked.
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

  const nothingRead = firstReadRow(table) === undefined && table.header === undefined;
  if (table.rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("sample.empty")}</p>;
  }

  return (
    <div className="grid gap-2">
      {nothingRead && <p className="text-sm text-muted-foreground">{t("sample.empty")}</p>}
      <div className="max-h-96 max-w-full overflow-auto rounded-lg border">
        <Table>
          <TableCaption className="sr-only">
            {t("sample.tableCaption", { name: fileName })}
          </TableCaption>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="h-auto py-2 text-right align-top text-xs font-normal text-muted-foreground">
                {t("sample.line")}
              </TableHead>
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
            {table.rows.map((row, rowIndex) =>
              "gap" in row ? (
                <GapRow key={rowIndex} columns={columns.length + 1}>
                  {t("sample.gap", { count: row.gap })}
                </GapRow>
              ) : row.skipped ? (
                <TableRow key={rowIndex} className="text-muted-foreground">
                  <TableCell className="tabular text-right align-top">{row.line}</TableCell>
                  <TableCell colSpan={Math.max(columns.length, 1)} className="max-w-64 truncate">
                    <span className="mr-2 rounded-sm border px-1 text-xs">
                      {t("sample.skipped")}
                    </span>
                    <span>{row.cells[0]}</span>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={rowIndex}>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {row.line}
                  </TableCell>
                  {columns.map((index) => (
                    <TableCell key={index} className="max-w-64 truncate">
                      {row.cells[index] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
