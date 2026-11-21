import { ChevronDownIcon, ChevronRightIcon, EllipsisIcon, LockIcon, PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import type { CategoryNode } from "../../lib/categories";
import { CategoryDialogs, type CategoryDialog } from "./category-dialogs";

const sections = ["EXPENSE", "INCOME", "INTERNAL"] as const;
type Section = (typeof sections)[number];

/**
 * The Category tree (spec, "Categories"): Expense, Income and Internal, each
 * an indented tree, all expanded at first. Internal Categories belong to the
 * system and have no actions.
 */
export function CategoriesPage({ householdId }: { householdId: string }) {
  const { t } = useTranslation("categories");
  const { api } = useApi();
  // The route's loader has fetched it already.
  const { data: tree } = api.useSuspenseQuery("get", "/households/{household_id}/categories", {
    params: { path: { household_id: householdId } },
  });
  const [dialog, setDialog] = useState<CategoryDialog | null>(null);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      {sections.map((kind) => (
        <CategorySection
          key={kind}
          kind={kind}
          roots={tree.items.filter((category) => category.kind === kind)}
          onDialog={setDialog}
        />
      ))}
      <CategoryDialogs
        householdId={householdId}
        tree={tree.items}
        dialog={dialog}
        onClose={() => {
          setDialog(null);
        }}
      />
    </div>
  );
}

function CategorySection({
  kind,
  roots,
  onDialog,
}: {
  kind: Section;
  roots: CategoryNode[];
  onDialog: (dialog: CategoryDialog) => void;
}) {
  const { t } = useTranslation("categories");
  const headingId = useId();
  const internal = kind === "INTERNAL";

  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {t(`sections.${kind}`)}
        </h2>
        {!internal && (
          <Button
            variant="outline"
            size="sm"
            aria-describedby={headingId}
            onClick={() => {
              onDialog({ type: "create", kind });
            }}
          >
            <PlusIcon aria-hidden="true" />
            {t("newCategory")}
          </Button>
        )}
      </div>
      {internal && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LockIcon aria-hidden="true" className="size-4" />
          {t("internalNote")}
        </p>
      )}
      <Card className="py-2">
        <CardContent className="px-2">
          {roots.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              {t("empty", { kind: t(`sections.${kind}`) })}
            </p>
          ) : (
            <CategoryList nodes={roots} depth={0} internal={internal} onDialog={onDialog} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function CategoryList({
  nodes,
  depth,
  internal,
  onDialog,
}: {
  nodes: CategoryNode[];
  depth: number;
  internal: boolean;
  onDialog: (dialog: CategoryDialog) => void;
}) {
  return (
    <ul className="grid">
      {nodes.map((node) => (
        <CategoryRow
          key={node.category_id}
          node={node}
          depth={depth}
          internal={internal}
          onDialog={onDialog}
        />
      ))}
    </ul>
  );
}

function CategoryRow({
  node,
  depth,
  internal,
  onDialog,
}: {
  node: CategoryNode;
  depth: number;
  internal: boolean;
  onDialog: (dialog: CategoryDialog) => void;
}) {
  const { t } = useTranslation("categories");
  const [expanded, setExpanded] = useState(true);
  const children = node.children ?? [];
  const listId = useId();

  return (
    <li>
      <div
        className={
          internal
            ? "flex min-h-11 items-center gap-1 rounded-md px-2 text-muted-foreground"
            : "flex min-h-11 items-center gap-1 rounded-md px-2 hover:bg-accent/50"
        }
        style={{ paddingInlineStart: `${String(0.5 + depth * 1.5)}rem` }}
      >
        {children.length > 0 ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-label={t(expanded ? "collapse" : "expand", { name: node.name })}
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDownIcon aria-hidden="true" />
            ) : (
              <ChevronRightIcon aria-hidden="true" />
            )}
          </Button>
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <span className="flex-1">{node.name}</span>
        {!internal && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("actions", { name: node.name })}
                />
              }
            >
              <EllipsisIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  onDialog({ type: "create", parent: node });
                }}
              >
                {t("addSub")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onDialog({ type: "rename", category: node });
                }}
              >
                {t("rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onDialog({ type: "move", category: node });
                }}
              >
                {t("move")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {children.length > 0 && (
        <div id={listId} hidden={!expanded}>
          <CategoryList
            nodes={children}
            depth={depth + 1}
            internal={internal}
            onDialog={onDialog}
          />
        </div>
      )}
    </li>
  );
}
