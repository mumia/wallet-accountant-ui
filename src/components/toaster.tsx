import { Toast } from "@base-ui/react/toast";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "./ui/button";

/**
 * The app's toasts (spec, "Talking to the API": a one-click action's failure),
 * on Base UI Toast, whose viewport is an F6 landmark. Toasts stay at the
 * default (polite) priority: a high-priority one puts `aria-hidden` on a
 * focusable element (Base UI #5659).
 */
export function Toaster({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { t } = useTranslation();
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="relative grid gap-1 rounded-lg border bg-popover p-3 pr-10 text-sm text-popover-foreground shadow-md"
    >
      <Toast.Title className="font-medium" />
      <Toast.Description className="text-muted-foreground" />
      <Toast.Close
        render={<Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" />}
        aria-label={t("dialog.close")}
      >
        <XIcon aria-hidden="true" />
      </Toast.Close>
    </Toast.Root>
  ));
}

/** Shows a failure that stays until the User closes it, so it can be read at any pace. */
export function useErrorToast(): (title: string, description?: string) => void {
  const { add } = Toast.useToastManager();
  return (title, description) => {
    add({ title, ...(description === undefined ? {} : { description }), timeout: 0 });
  };
}
