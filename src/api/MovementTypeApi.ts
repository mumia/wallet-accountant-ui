import { DataService } from "../config/dataService";
import TagApi from "./TagApi";
import AccountApi, { Account } from "./AccountApi";
import { HttpStatusCode } from "axios";
import { tagCategoriesToTagDetail, TagDetail } from "./AccountMonthApi";

interface NewMovementTypeApi {
  action: string;
  accountId: string;
  sourceAccountId?: string;
  description: string;
  tags: string[];
}

export type MovementTypeApiResponse = NewMovementTypeApi & {
  movementTypeId: string
}

export interface AccountMovementType {
  account: Account;
  movementTypes: MovementType[];
}

export interface MovementType {
  movementTypeId: string;
  action: string;
  account: Account;
  sourceAccount?: Account;
  description: string;
  tags: TagDetail[];
}

const accountApi = new AccountApi();
const tagApi = new TagApi();

async function resolveMovementType(
  movementType: MovementTypeApiResponse
): Promise<MovementType> {
  let tagIds: string[] = [];
  movementType.tags.forEach(tagId => tagIds.push(tagId));

  const tagsFetch = tagApi.tags(tagIds);
  const accountFetch = accountApi.account(movementType.accountId);
  const sourceAccountFetch = movementType.sourceAccountId === null || movementType.sourceAccountId === undefined
    ? Promise.resolve(undefined)
    : accountApi.account(movementType.sourceAccountId);

  const tagCategories = await tagsFetch;
  const account = await accountFetch;
  const sourceAccount = await sourceAccountFetch;

  return {
    movementTypeId: movementType.movementTypeId,
    action: movementType.action,
    account: account,
    sourceAccount: sourceAccount === undefined
      ? undefined
      : sourceAccount,
    description: movementType.description,
    tags: tagCategoriesToTagDetail(tagCategories)
  };
}

export default class MovementTypeApi extends DataService {
  async movementTypes(): Promise<AccountMovementType[]> {
    const response = await this.client.get<MovementTypeApiResponse[]>("/movement-type");

    const movementTypeList = await Promise.all(
      response.data.map(
        movementType => {
          return resolveMovementType(movementType);
        }
      )
    );

    let accountIndex: string[] = [];
    let accountMovementTypes: AccountMovementType[] = [];
    movementTypeList.forEach(
      movementType => {
        const index = accountIndex.indexOf(movementType.account.accountId);
        if (index < 0) {
          accountIndex.push(movementType.account.accountId);
          accountMovementTypes.push({account: movementType.account, movementTypes: [movementType]});

          return;
        }

        accountMovementTypes[index].movementTypes.push(movementType);
      }
    );

    return accountMovementTypes;
  }

  async movementTypesByAccountId(accountId: string): Promise<MovementTypeApiResponse> {
    const response = await this.client.get<MovementTypeApiResponse>(
      "/movement-type/account/" + accountId
    );

    return response.data;
  }

  async registerMovementType(accountId: string, newMovementTypeApi: NewMovementTypeApi): Promise<boolean> {
    newMovementTypeApi.accountId = accountId

    const response = await this.client.post('/movement-type', newMovementTypeApi);

    return response.status === HttpStatusCode.Created
  }
}
