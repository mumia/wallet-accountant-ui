import { LogOutIcon, PaletteIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

import { AppearanceDialog } from "../../components/appearance-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { SidebarMenuButton } from "../../components/ui/sidebar";

/** The User menu: who is signed in (from the token), Appearance… and Sign out. */
export function UserMenu() {
  const { t: tCommon } = useTranslation();
  const auth = useAuth();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const profile = auth.user?.profile;
  const name = profile?.name ?? profile?.preferred_username ?? profile?.email ?? "";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton size="lg">
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{name}</span>
                {profile?.email !== undefined && profile.email !== name && (
                  <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
                )}
              </span>
            </SidebarMenuButton>
          }
        />
        <DropdownMenuContent side="top" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              setAppearanceOpen(true);
            }}
          >
            <PaletteIcon aria-hidden="true" />
            {tCommon("appearance.open")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void auth.signoutRedirect()}>
            <LogOutIcon aria-hidden="true" />
            {tCommon("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AppearanceDialog open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </>
  );
}
