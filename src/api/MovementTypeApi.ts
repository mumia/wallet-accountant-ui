import { DataService } from "../config/dataService";
import TagApi, { NewTagInCategory } from "./TagApi";
import AccountApi from "./AccountApi";
import { HttpStatusCode } from "axios";

interface NewMovementTypeApi {
  type: string;
  accountId: string;
  sourceAccountId?: string;
  description: string;
  tags: string[];
}

export type MovementTypeApiResponse = NewMovementTypeApi & {
  movementTypeId: string
}

export interface AccountMovementType {
  account: AccountDetail;
  movementTypes: MovementType[];
}

export interface MovementType {
  movementTypeId: string;
  type: string;
  account: AccountDetail;
  sourceAccount?: AccountDetail;
  description: string;
  tags: TagDetail[];
}

export interface TagDetail {
  tagCategoryId: string;
  tagId: string;
  category: string;
  name: string;
}

export interface AccountDetail {
  accountId: string;
  name: string;
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

  return {
    movementTypeId: movementType.movementTypeId,
    type: movementType.type,
    account: {
      accountId: account.accountId,
      name: account.name
    },
    sourceAccount: sourceAccount === undefined
      ? undefined
      : {
        accountId: sourceAccount.accountId,
        name: sourceAccount.name
      },
    description: movementType.description,
    tags: tagDetails
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

  async registerMovementType(accountId: string, newMovementTypeApi: NewMovementTypeApi): Promise<boolean> {
    newMovementTypeApi.accountId = accountId

    const response = await this.client.post('/movement-type', newMovementTypeApi);

    return response.status === HttpStatusCode.Created
  }
}
