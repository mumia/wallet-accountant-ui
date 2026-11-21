import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { components } from "../../api/schema.gen";
import { HouseholdForm } from "../../components/household-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "../../components/ui/sidebar";

type Household = components["schemas"]["Household"];

/** The Household switcher: every Household of the User, and Create Household. */
export function HouseholdSwitcher({
  current,
  households,
}: {
  current: Household;
  households: Household[];
}) {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton size="lg">
              <span className="grid flex-1 text-left leading-tight">
                <span className="text-xs text-muted-foreground">{t("switcher.household")}</span>
                <span className="truncate font-semibold">{current.name}</span>
              </span>
              <ChevronsUpDownIcon aria-hidden="true" className="ml-auto" />
            </SidebarMenuButton>
          }
        />
        <DropdownMenuContent className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("switcher.households")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={current.household_id}
              onValueChange={(householdId: string) => {
                setOpenMobile(false);
                void navigate({ to: "/households/$householdId", params: { householdId } });
              }}
            >
              {households.map((household) => (
                <DropdownMenuRadioItem key={household.household_id} value={household.household_id}>
                  {household.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCreating(true);
            }}
          >
            <PlusIcon aria-hidden="true" />
            {t("switcher.create")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createHousehold.title")}</DialogTitle>
            <DialogDescription>{t("createHousehold.description")}</DialogDescription>
          </DialogHeader>
          <HouseholdForm
            onCreated={() => {
              setCreating(false);
              setOpenMobile(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
