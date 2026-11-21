import type { ReactNode } from "react";

import { SignOutButton } from "../../components/sign-out-button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "../../components/ui/card";

/**
 * The centred card `/register` and `/households/new` are shown in, without the
 * sidebar, with Sign out for someone signed in with the wrong identity.
 */
export function FirstRunCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-lg leading-snug font-semibold">{title}</h1>
          <CardDescription>{description}</CardDescription>
          <CardAction>
            <SignOutButton />
          </CardAction>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
