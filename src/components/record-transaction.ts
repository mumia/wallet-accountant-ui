// How any screen of a cash Account's area opens the Record a Transaction sheet
// (cash-accounts-and-transfers spec, "Record a Transaction"). The sheet itself
// is the transactions feature's; the Account's route puts it around the area.
import { createContext, useContext } from "react";

import type { IsoDate } from "../lib/date";
import type { Decimal } from "../lib/money";

/** What a screen can fill in when it opens the sheet, such as Record the difference…. */
export interface RecordPrefill {
  amount?: Decimal;
  date?: IsoDate;
  description?: string;
  /** Called after each save from this opening, such as to clear the refusal it answers. */
  onRecorded?: () => void;
}

export type OpenRecord = (prefill?: RecordPrefill) => void;

export const RecordContext = createContext<OpenRecord | undefined>(undefined);

/**
 * Opens the Record a Transaction sheet, optionally prefilled; undefined
 * outside a cash Account's area, where there is nothing to record by hand.
 */
export function useRecordTransaction(): OpenRecord | undefined {
  return useContext(RecordContext);
}
