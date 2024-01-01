import { DataService } from "../config/dataService";
import { HttpStatusCode } from "axios";
import TagApi, { TagCategory } from "./TagApi";
import AccountApi, { Account } from "./AccountApi";

interface AccountMonthResponse {
  accountMonthId: string;
  accountId: string;
  activeMonth: ActiveMonth;
  movements: AccountMovementResponse[];
  balance: number;
  initialBalance: number;
  monthEnded: boolean;
}

interface NewAccountMovement {
  movementTypeId?: string
  action: string;
  accountId: string;
  sourceAccountId?: string;
  description: string;
  amount: number
  date: Date
  tagIds: string[];
}

type AccountMovementResponse = NewAccountMovement & {
  accountMovementId: string;
}

interface ActiveMonth {
  month: number;
  year:  number;
}

export interface AccountMonth {
  accountMonthId: string;
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

export default class AccountMonthApi extends DataService {
  async accountMonth(accountId: string): Promise<AccountMonth> {
    const response = await this.client.get<AccountMonthResponse>("/account-month/" + accountId);

    const accountFetch = accountApi.account(response.data.accountId);

    return {
      accountMonthId: response.data.accountMonthId,
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
    } as AccountMonth;
  }

  async registerNewAccountMovement(accountId: string, newAccountMovement: NewAccountMovement): Promise<boolean> {
    newAccountMovement.accountId = accountId;

    const response = await this.client.post(
      '/account-month/account-movement',
      newAccountMovement);

    return response.status === HttpStatusCode.Created
  }
}
