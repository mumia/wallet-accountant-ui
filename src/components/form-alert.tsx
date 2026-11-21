import { CircleAlertIcon } from "lucide-react";

import { useErrorText } from "./error-text";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

/** A form's failed request, shown at the top of the form; the input stays. */
export function FormAlert({ error }: { error: unknown }) {
  const { title, detail } = useErrorText(error);
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {detail !== undefined && <AlertDescription>{detail}</AlertDescription>}
    </Alert>
  );
}
