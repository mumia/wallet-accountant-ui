import { DataService } from "../config/dataService";
import { HttpStatusCode } from "axios";
import TagApi, { TagCategory } from "./TagApi";
import AccountApi, { Account } from "./AccountApi";

interface LedgerResponse {
  ledgerId: string
  accountId: string
  activeMonth: ActiveMonth
  movements: AccountMovementResponse[]
  balance: number
  initialBalance: number
  monthEnded: boolean
}

export interface NewAccountMovement {
  movementTypeId?: string
  action: string
  accountId: string
  sourceAccountId?: string
  description: string
  amount: number
  date: Date
  tagIds: string[]
}

type AccountMovementResponse = NewAccountMovement & {
  accountMovementId: string
}

interface ActiveMonth {
  month: number
  year:  number
}

export interface Ledger {
  ledgerId: string;
  account: Account;
  activeMonth: ActiveMonth;
  movements: AccountMovement[];
  balance: number;
  initialBalance: number;
  monthEnded: boolean;
}

export interface AccountMovement {
  accountMovementId: string;
  movementTypeId?: string;
  action: string;
  sourceAccount?: Account;
  description: string;
  amount: number
  date: Date
  tags: TagDetail[];
}

export interface TagDetail {
  tagCategoryId: string;
  tagId: string;
  category: string;
  name: string;
}

interface EndMonth {
  accountId: string;
  year: number;
  month: number;
  endBalance: number;
}

const accountApi = new AccountApi();
const tagApi = new TagApi();

async function resolveAccountMovement(accountMovement: AccountMovementResponse): Promise<AccountMovement> {
  const tagsFetch = tagApi.tags(accountMovement.tagIds);
  const sourceAccountFetch = accountMovement.sourceAccountId === null || accountMovement.sourceAccountId === undefined
      ? Promise.resolve(undefined)
      : accountApi.account(accountMovement.sourceAccountId);

  const tagCategories = await tagsFetch;
  const sourceAccount = await sourceAccountFetch;

  return {
    accountMovementId: accountMovement.accountMovementId,
    movementTypeId: accountMovement.movementTypeId,
    action: accountMovement.action,
    sourceAccount: sourceAccount === undefined
        ? undefined
        : sourceAccount,
    description: accountMovement.description,
    amount: accountMovement.amount,
    date: accountMovement.date,
    tags: tagCategoriesToTagDetail(tagCategories)
  };
}

export function tagCategoriesToTagDetail(tagCategories: TagCategory[]) {
  let tagDetails: TagDetail[] = [];
  tagCategories.forEach(
    tagCategory => {
      tagCategory.tags.forEach(
        tag => {
          const tagDetail = {
            tagCategoryId: tagCategory.tagCategoryId,
            tagId: tag.tagId,
            category: tagCategory.name,
            name: tag.name
          }

          if (tagDetails.indexOf(tagDetail) < 0) {
            tagDetails.push(tagDetail);
          }
        }
      );
    }
  );

  return tagDetails
}

export default class LedgerApi extends DataService {
  async ledger(accountId: string): Promise<Ledger> {
    const response = await this.client.get<LedgerResponse>("/ledger/" + accountId);

    const accountFetch = accountApi.account(response.data.accountId);

    return {
      ledgerId: response.data.ledgerId,
      account: await accountFetch,
      monthEnded: response.data.monthEnded,
      activeMonth: response.data.activeMonth,
      movements: await Promise.all(
          response.data.movements.map(
              accountMovement => {
                return resolveAccountMovement(accountMovement);
              }
          )
      ),
      balance: response.data.balance,
      initialBalance: response.data.initialBalance,
    } as Ledger;
  }

  async registerNewAccountMovement(accountId: string, newAccountMovement: NewAccountMovement): Promise<boolean> {
    newAccountMovement.accountId = accountId;

    const response = await this.client.post(
      '/ledger/account-movement',
      newAccountMovement);

    return response.status === HttpStatusCode.Created
  }

  async endMonth(account: Account, endMonth: EndMonth): Promise<boolean> {
    endMonth.accountId = account.accountId;
    endMonth.year = account.activeMonth.year;
    endMonth.month= account.activeMonth.month;

    const response = await this.client.put('/ledger', endMonth);

    return response.status === HttpStatusCode.NoContent
  }
}
