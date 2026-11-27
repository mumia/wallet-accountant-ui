// The backend's Category direction rule, word for word
// (../wallet-accountant/internal/ledger/domain/direction.go and
// internal/platform/httpapi/problem.go): an Expense Category takes only money
// out and an Income Category only money in. Accept, Set Category and recording
// a cash Transaction all check it, after their own Category refusals.
import type { components } from "../api/schema.gen";

type Category = components["schemas"]["Category"];
type TransferProblem = components["schemas"]["TransferProblem"];

/**
 * The 422 for `category` on `amount`, the Account side's (positive for money
 * in), or undefined when it fits: Internal Categories, such as Uncategorised,
 * and a zero amount take either.
 */
export function categoryDirection(
  category: Pick<Category, "category_id" | "kind">,
  amount: string,
): TransferProblem | undefined {
  const zero = !/[1-9]/.test(amount);
  const out = amount.trim().startsWith("-");
  if (zero) {
    return undefined;
  }
  if (category.kind === "EXPENSE" && !out) {
    return refusal(category.category_id, "EXPENSE", "IN");
  }
  if (category.kind === "INCOME" && out) {
    return refusal(category.category_id, "INCOME", "OUT");
  }
  return undefined;
}

function refusal(
  categoryId: string,
  kind: "INCOME" | "EXPENSE",
  direction: "IN" | "OUT",
): TransferProblem {
  return {
    type: "/problems/category-direction",
    title: "Category doesn't fit the amount",
    status: 422,
    detail:
      kind === "INCOME"
        ? "An Income Category takes only money in, and this amount is money out. Choose an Expense Category, or Uncategorised."
        : "An Expense Category takes only money out, and this amount is money in. Choose an Income Category, or Uncategorised.",
    category_id: categoryId,
    category_kind: kind,
    direction,
  };
}
