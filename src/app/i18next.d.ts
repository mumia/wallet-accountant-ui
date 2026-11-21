import type { defaultNS, resources } from "./i18n";

// Makes every t() key type-checked against the English message files.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["en"];
  }
}
