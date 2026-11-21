import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import { errorStatus, isProblem } from "../../api/problem";
import { CategoryPicker, topLevel } from "../../components/category-picker";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { flattenCategories, selfAndDescendants, type CategoryNode } from "../../lib/categories";

export type CategoryDialog =
  | { type: "create"; kind: "EXPENSE" | "INCOME" }
  | { type: "create"; parent: CategoryNode }
  | { type: "rename"; category: CategoryNode }
  | { type: "move"; category: CategoryNode };

/** The Categories screen's dialogs: Create and Rename share one Name field; Move uses the picker. */
export function CategoryDialogs({
  householdId,
  tree,
  dialog,
  onClose,
}: {
  householdId: string;
  tree: CategoryNode[];
  dialog: CategoryDialog | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("categories");
  // The dialog stays mounted while it closes, so its text doesn't vanish mid-animation.
  const [shown, setShown] = useState(dialog);
  if (dialog !== null && dialog !== shown) {
    setShown(dialog);
  }
  const paths = useMemo(
    () => new Map(flattenCategories(tree).map(({ id, path }) => [id, path.join(" › ")])),
    [tree],
  );
  const pathOf = (node: CategoryNode) => paths.get(node.category_id) ?? node.name;

  let title = "";
  let description = "";
  if (shown?.type === "create") {
    if ("parent" in shown) {
      title = t("dialogs.createSub.title");
      description = t("dialogs.createSub.description", { parent: pathOf(shown.parent) });
    } else {
      title = t("dialogs.createRoot.title", { kind: t(`sections.${shown.kind}`) });
      description = t("dialogs.createRoot.description");
    }
  } else if (shown?.type === "rename") {
    title = t("dialogs.rename.title");
    description = t("dialogs.rename.description", { category: pathOf(shown.category) });
  } else if (shown?.type === "move") {
    title = t("dialogs.move.title");
    description = t("dialogs.move.description", { category: pathOf(shown.category) });
  }

  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {dialog?.type === "move" ? (
          <MoveForm
            householdId={householdId}
            tree={tree}
            category={dialog.category}
            onDone={onClose}
          />
        ) : dialog !== null ? (
          <NameForm householdId={householdId} dialog={dialog} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function useInvalidateCategories(householdId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: [
        "get",
        "/households/{household_id}/categories",
        { params: { path: { household_id: householdId } } },
      ],
    });
}

function NameForm({
  householdId,
  dialog,
  onDone,
}: {
  householdId: string;
  dialog: Exclude<CategoryDialog, { type: "move" }>;
  onDone: () => void;
}) {
  const { t } = useTranslation("categories");
  const { api } = useApi();
  const nameId = useId();
  const invalidate = useInvalidateCategories(householdId);
  const create = api.useMutation("post", "/households/{household_id}/categories");
  const change = api.useMutation("patch", "/households/{household_id}/categories/{category_id}");
  const write = dialog.type === "rename" ? change : create;

  const schema = z.object({
    name: z.string().trim().min(1, t("dialogs.nameRequired")).max(100, t("dialogs.nameTooLong")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: dialog.type === "rename" ? dialog.category.name : "" },
  });
  const nameError = form.formState.errors.name?.message;

  const options = {
    onSuccess: () => {
      void invalidate();
      onDone();
    },
    // A sibling with the same name: shown on the Name field (spec, "Categories").
    onError: (error: unknown) => {
      if (errorStatus(error) === 409 && isProblem(error)) {
        form.setError("name", { message: error.detail ?? error.title }, { shouldFocus: true });
      }
    },
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(({ name }) => {
          const path = { household_id: householdId };
          if (dialog.type === "rename") {
            change.mutate(
              {
                params: { path: { ...path, category_id: dialog.category.category_id } },
                body: { name },
              },
              options,
            );
          } else if ("parent" in dialog) {
            create.mutate(
              { params: { path }, body: { name, parent_id: dialog.parent.category_id } },
              options,
            );
          } else {
            create.mutate({ params: { path }, body: { name, kind: dialog.kind } }, options);
          }
        })(event);
      }}
    >
      <FieldGroup>
        {write.isError && errorStatus(write.error) !== 409 && <FormAlert error={write.error} />}
        <Field data-invalid={nameError !== undefined}>
          <FieldLabel htmlFor={nameId}>{t("dialogs.name")}</FieldLabel>
          <Input
            id={nameId}
            autoComplete="off"
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError === undefined ? undefined : `${nameId}-error`}
            {...form.register("name")}
          />
          {nameError !== undefined && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
        </Field>
        <Button type="submit" disabled={write.isPending}>
          {dialog.type === "rename" ? t("dialogs.rename.submit") : t("dialogs.create")}
        </Button>
      </FieldGroup>
    </form>
  );
}

function MoveForm({
  householdId,
  tree,
  category,
  onDone,
}: {
  householdId: string;
  tree: CategoryNode[];
  category: CategoryNode;
  onDone: () => void;
}) {
  const { t } = useTranslation("categories");
  const { api } = useApi();
  const pickerId = useId();
  const invalidate = useInvalidateCategories(householdId);
  const move = api.useMutation("patch", "/households/{household_id}/categories/{category_id}");
  const [target, setTarget] = useState<string | null>(category.parent_id ?? topLevel);
  const exclude = useMemo(() => selfAndDescendants(tree, category.category_id), [tree, category]);
  const kind = category.kind === "INCOME" ? "INCOME" : "EXPENSE";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (target === null) {
          return;
        }
        move.mutate(
          {
            params: { path: { household_id: householdId, category_id: category.category_id } },
            body: { parent_id: target === topLevel ? null : target },
          },
          {
            onSuccess: () => {
              void invalidate();
              onDone();
            },
          },
        );
      }}
    >
      <FieldGroup>
        {move.isError && <FormAlert error={move.error} />}
        <Field>
          <FieldLabel id={`${pickerId}-label`} htmlFor={pickerId}>
            {t("dialogs.move.to")}
          </FieldLabel>
          <CategoryPicker
            id={pickerId}
            label={{ id: `${pickerId}-label` }}
            categories={tree}
            value={target}
            onValueChange={setTarget}
            kinds={[kind]}
            includeUncategorised={false}
            exclude={exclude}
            topLevelLabel={t("dialogs.move.topLevel")}
          />
        </Field>
        <Button type="submit" disabled={move.isPending || target === null}>
          {t("dialogs.move.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
