import { LogOutIcon, PaletteIcon, UserPenIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";

import { AppearanceDialog } from "../../components/appearance-dialog";
import { useMe } from "../../components/me";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { SidebarMenuButton } from "../../components/ui/sidebar";
import { YourNameDialog } from "../../components/your-name-dialog";

/**
 * The User menu: who is signed in, Your name…, Appearance… and Sign out. The
 * name is the User's display name (`GET /me`), or the token's while that loads
 * or when the User has none yet; then a dot invites them to set one.
 */
export function UserMenu() {
  const { t } = useTranslation("shell");
  const { t: tCommon } = useTranslation();
  const auth = useAuth();
  const me = useMe();
  const [yourNameOpen, setYourNameOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const profile = auth.user?.profile;
  const displayName = me?.display_name;
  const name = displayName ?? profile?.name ?? profile?.preferred_username ?? profile?.email ?? "";
  // Only once `GET /me` has said so: not while it loads, nor when it failed.
  const nameless = me !== undefined && displayName === undefined;

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
              {nameless && (
                <>
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                  <span className="sr-only">{t("userMenu.noName")}</span>
                </>
              )}
            </SidebarMenuButton>
          }
        />
        <DropdownMenuContent side="top" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              setYourNameOpen(true);
            }}
          >
            <UserPenIcon aria-hidden="true" />
            {nameless ? t("userMenu.setYourName") : t("userMenu.yourName")}
          </DropdownMenuItem>
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
      <YourNameDialog
        displayName={displayName}
        open={yourNameOpen}
        onOpenChange={setYourNameOpen}
      />
      <AppearanceDialog open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </>
  );
}
