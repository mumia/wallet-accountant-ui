import React, { ReactElement, useState } from "react";
import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import { Cards } from "../../components/cards/frame/cards-frame";
import MovementTypeApi, { AccountMovementType, MovementType } from "../../api/MovementTypeApi";
import { useLoaderData, useNavigate } from "react-router-dom";
import { Button, Collapse, CollapseProps, Table, Tag } from "antd";
import { UilPlus } from "@iconscout/react-unicons";
import RegisterNewMovementType from "./RegisterNewMovementType";
import AccountApi, { Account } from "../../api/AccountApi";
import TagApi, { TagCategory } from "../../api/TagApi";
import useWebSocket from "react-use-websocket";
import { WebSocketRunnerHelper, WS_URL } from "../../layout/WebSocketRunner";

interface TableData {
  description: ReactElement;
  account: ReactElement;
  sourceAccount: ReactElement;
  type: ReactElement;
  tags: ReactElement;
}

const api = new MovementTypeApi();
const accountApi = new AccountApi();
const tagApi = new TagApi();

export async function loader() {
  return Promise.all([api.movementTypes(), accountApi.accounts(), tagApi.tags()]);
}

type ModalState = {
  account: Account;
  visible: boolean;
}
const defaultModalState = {
  account: {} as Account,
  visible: false
};

function getMovementTypesTableData(movementTypes: MovementType[]): TableData[] {
  const tableData: TableData[] = [];

  if (movementTypes.length <= 0) {
    return tableData;
  }

  movementTypes.forEach((item) => {
    tableData.push({
      description: <span>{item.description}</span>,
      account: <span>{item.account.name}</span>,
      sourceAccount: <span>{item.sourceAccount?.name || "N/A"}</span>,
      type: <span>{item.action}</span>,
      tags: <span>
        {
          item.tags.map(
            tagDetail => <Tag color="gray"># {tagDetail.category}: {tagDetail.name}</Tag>
          )
        }
      </span>
    });
  });


  return tableData;
}

const MovementTypes = (): React.JSX.Element => {
  const navigate = useNavigate();
  const [modalState, setModalState] = useState<ModalState>(defaultModalState);
  const [accountMovementTypes, accounts, tagCategories] = useLoaderData() as [AccountMovementType[], Account[], TagCategory[]];

  const columns = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description"
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type"
    },
    {
      title: "Account",
      dataIndex: "account",
      key: "account"
    },
    {
      title: "Source account",
      dataIndex: "sourceAccount",
      key: "sourceAccount"
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags"
    }
  ];

  const showModal = (account: Account, event: React.MouseEvent<HTMLElement>) => {
    // don't trigger collapse
    event.stopPropagation();

    setModalState({ account: account, visible: true });
  };

  const hideModal = () => setModalState(defaultModalState);

  let items: CollapseProps["items"] = accountMovementTypes.map(
    accountMovementType => {
      return {
        key: accountMovementType.account.accountId,
        label: <>
          <strong>{accountMovementType.account.name}</strong> ({accountMovementType.movementTypes.length} types)</>,
        children: <Table
          pagination={false}
          dataSource={getMovementTypesTableData(accountMovementType.movementTypes)}
          columns={columns}
        />,
        extra: <Button
          onClick={(event: React.MouseEvent<HTMLElement>) => {
            showModal(accountMovementType.account, event);
          }}
          key="1"
          type="primary"
          size="small"
          className="btn-add_new">
          <UilPlus />
        </Button>
      };
    }
  );
  items = items.concat(
    accounts
      .filter(
        account => {
          if (items === undefined) {
            return true;
          }

          return items.find(item => item.key === account.accountId) === undefined
        }
      )
      .map(
        account => {
          return {
            key: account.accountId,
            label: <><strong>{account.name}</strong> (No types)</>,
            children: <span>No movement types registered for this account</span>,
            extra: <Button
              onClick={(event: React.MouseEvent<HTMLElement>) => {
                showModal(account, event);
              }}
              key="1"
              type="primary"
              size="small"
              className="btn-add_new">
              <UilPlus />
            </Button>
          };
        }
      )
  );

  const refresh = () => navigate(".");

  useWebSocket(
    WS_URL,
    WebSocketRunnerHelper("movementType", refresh)
  );

  return (
    <>
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Movement types"
          // subTitle={<>{accountsTableData.length} accounts</>}
        />
      </CardToolbox>
      <Main>
        <Cards headless>
          {items.length > 0
            ? (<Collapse items={items} />)
            : (<div>No movement types registered</div>)
          }
        </Cards>
        <RegisterNewMovementType
          onClose={hideModal}
          currentAccount={modalState.account}
          visible={modalState.visible}
          accounts={accounts}
          tagCategories={tagCategories}
        />
      </Main>
    </>
  );
};

export default MovementTypes;
