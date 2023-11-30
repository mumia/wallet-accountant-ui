import { DataService } from "../config/dataService";
import { HttpStatusCode } from "axios";

type ActiveMonth = {
  month: number;
  year: number;
};

export interface AccountBase {
  accountType: number;
  bankName: string;
  /* eslint-disable no-restricted-globals */
  name: string;
  currency: string;
  startingBalance: number;
  startingBalanceDate: Date;
  notes?: string;
}

export type Account = AccountBase & {
  accountId: string; // UUID
  activeMonth: ActiveMonth;
};

export default class AccountApi extends DataService {
  async accounts(): Promise<Account[]> {
    const response = await this.client.get<Account[]>("/accounts");

    return response.data;
  }

  async registerAccount(account: AccountBase): Promise<boolean> {
    const response = await this.client.post('/account', account);

    return response.status === HttpStatusCode.Created
  }
}
