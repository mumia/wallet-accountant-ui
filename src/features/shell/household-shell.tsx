import { Link, useMatchRoute } from "@tanstack/react-router";
import { FolderTreeIcon, LayoutListIcon, PlusIcon } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useAccountLabels } from "../../components/account-labels";
import { useOpenAddAccount } from "../../components/add-account";
import { MainProvided } from "../../components/main-landmark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "../../components/ui/sidebar";
import { saveLastHousehold } from "../../lib/last-household";
import { HouseholdSwitcher } from "./household-switcher";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

/**
 * The shell around every screen of a Household (spec, "Screens and routes"): a
 * left sidebar, a drawer on narrow screens, with the Household switcher,
 * Accounts, Categories, the Notifications bell and the User menu.
 */
export function HouseholdShell({
  householdId,
  children,
}: {
  householdId: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("shell");
  const { api } = useApi();
  // The route's loader has fetched all three.
  const { data: household } = api.useSuspenseQuery("get", "/households/{household_id}", {
    params: { path: { household_id: householdId } },
  });
  const { data: households } = api.useSuspenseQuery("get", "/households");

  useEffect(() => {
    saveLastHousehold(householdId);
  }, [householdId]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-1">
            <HouseholdSwitcher current={household} households={households.items} />
            <NotificationsBell householdId={householdId} />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label={t("navigation")}>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NavLink
                    to="/households/$householdId"
                    householdId={householdId}
                    icon={<LayoutListIcon aria-hidden="true" />}
                  >
                    {t("overview")}
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <AccountsGroup householdId={householdId} />
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NavLink
                    to="/households/$householdId/categories"
                    householdId={householdId}
                    icon={<FolderTreeIcon aria-hidden="true" />}
                  >
                    {t("categories")}
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="truncate font-medium md:hidden">{household.name}</span>
        </header>
        <div className="flex-1 p-4 md:p-6">
          <MainProvided>{children}</MainProvided>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NavLink({
  to,
  householdId,
  icon,
  children,
}: {
  to: "/households/$householdId" | "/households/$householdId/categories";
  householdId: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const matchRoute = useMatchRoute();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton
      isActive={matchRoute({ to, params: { householdId } }) !== false}
      render={
        <Link
          to={to}
          params={{ householdId }}
          activeOptions={{ exact: true }}
          onClick={() => {
            setOpenMobile(false);
          }}
        />
      }
    >
      {icon}
      <span>{children}</span>
    </SidebarMenuButton>
  );
}

function AccountsGroup({ householdId }: { householdId: string }) {
  const { t } = useTranslation("shell");
  const { api } = useApi();
  const labels = useAccountLabels();
  const matchRoute = useMatchRoute();
  const { setOpenMobile } = useSidebar();
  const openAddAccount = useOpenAddAccount();
  const labelId = useId();
  const { data: accounts } = api.useSuspenseQuery("get", "/households/{household_id}/accounts", {
    params: { path: { household_id: householdId } },
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel id={labelId}>{t("accounts")}</SidebarGroupLabel>
      <SidebarMenu aria-labelledby={labelId}>
        {accounts.items.map((account) => {
          const params = { householdId, accountId: account.account_id };
          return (
            <SidebarMenuItem key={account.account_id}>
              <SidebarMenuButton
                size="lg"
                isActive={
                  matchRoute({
                    to: "/households/$householdId/accounts/$accountId",
                    params,
                    fuzzy: true,
                  }) !== false
                }
                render={
                  <Link
                    to="/households/$householdId/accounts/$accountId"
                    params={params}
                    onClick={() => {
                      setOpenMobile(false);
                    }}
                  />
                }
              >
                <span className="grid min-w-0 leading-tight">
                  <span className="truncate font-medium">{account.name}</span>
                  <span className="truncate text-xs text-muted-foreground tabular-nums">
                    {labels.balance(account)}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
        {accounts.items.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setOpenMobile(false);
                openAddAccount();
              }}
            >
              <PlusIcon aria-hidden="true" />
              <span>{t("addAccount")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
