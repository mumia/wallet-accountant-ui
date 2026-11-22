// Long lists in a real <table> (spec, "Long lists"): with `virtual`, only the
// rows near the viewport are in the page, between spacer rows, and `onNearEnd`
// asks for more as the last ones come near.
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";

export function useWindowRows({
  count,
  estimate,
  virtual,
  onNearEnd,
}: {
  count: number;
  /** A row's height in pixels; rows are measured once shown. */
  estimate: number;
  virtual: boolean;
  onNearEnd: (() => void) | undefined;
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Where the rows start on the page, measured once.
  useEffect(() => {
    setScrollMargin((bodyRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: virtual ? count : 0,
    estimateSize: () => estimate,
    overscan: 10,
    scrollMargin,
  });
  const items = virtualizer.getVirtualItems();
  const lastIndex = items.at(-1)?.index ?? -1;
  useEffect(() => {
    if (virtual && lastIndex >= count - 20) {
      onNearEnd?.();
    }
  }, [virtual, lastIndex, count, onNearEnd]);

  return {
    bodyRef,
    /** The indexes of the rows to render, in order. */
    indexes: virtual ? items.map((item) => item.index) : Array.from({ length: count }, (_, i) => i),
    /** The heights of the spacer rows before and after them. */
    before: virtual ? (items[0]?.start ?? 0) - virtualizer.options.scrollMargin : 0,
    after: virtual ? virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0) : 0,
    /** Put on each row with `data-index`, so rows of any height are measured. */
    measure: virtual ? virtualizer.measureElement : undefined,
  };
}
