import { createContext, use, type ReactNode } from "react";

const InsideMain = createContext(false);

/** Marks its children as already inside the page's `<main>` (the shell's). */
export function MainProvided({ children }: { children: ReactNode }) {
  return <InsideMain value={true}>{children}</InsideMain>;
}

/**
 * A screen's content in a `<main>`, unless the shell already gives it one: an
 * error or "not found" can show inside the shell or in place of it.
 */
export function MainLandmark({ className, children }: { className: string; children: ReactNode }) {
  return use(InsideMain) ? (
    <div className={className}>{children}</div>
  ) : (
    <main className={className}>{children}</main>
  );
}
