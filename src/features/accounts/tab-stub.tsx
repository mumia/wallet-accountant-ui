import { useTranslation } from "react-i18next";

const titles = {
  toReview: "area.toReview",
  transactions: "area.transactions",
  months: "area.months",
  statementImports: "area.statementImports",
  connections: "area.connections",
  newConnection: "stub.newConnection",
  editConnection: "stub.editConnection",
} as const;

/** A tab or page of the Account area that a later ticket builds. */
export function AccountTabStub({ page }: { page: keyof typeof titles }) {
  const { t } = useTranslation("accounts");
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{t(titles[page])}</h2>
      <p className="text-muted-foreground">{t("stub.body")}</p>
    </section>
  );
}
