import { cn } from "cn";

/** One figure of a step, as a term and its value inside a `<dl>`. */
export function Stat({ label, value, text }: { label: string; value: string; text?: boolean }) {
  return (
    <div className="grid content-start gap-1 rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-semibold",
          text === true ? "text-sm break-all" : "text-lg tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
