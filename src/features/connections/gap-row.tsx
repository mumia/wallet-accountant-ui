import { TableCell, TableRow } from "../../components/ui/table";

/** A table row across `columns` columns saying what is left out between the rows around it. */
export function GapRow({ columns, children }: { columns: number; children: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
