import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import React, { ReactElement, ReactNode, useState } from "react";
import AccountApi, { Account } from "../../api/AccountApi";
import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import AccountMonthApi, { AccountMonth, TagDetail } from "../../api/AccountMonthApi";
import { Button, Col, Divider, Row, Table, Tag as AntTag } from "antd";
import { Cards } from "../../components/cards/frame/cards-frame";
import { UilFileCheckAlt, UilPlus } from "@iconscout/react-unicons";
import MovementTypeApi, { MovementTypeApiResponse } from "../../api/MovementTypeApi";
import RegisterNewMovement from "./RegisterNewMovement";
import TagApi, { TagCategory } from "../../api/TagApi";
import { euroFormatter, padValue } from "../../config/stringHelper";
import Money from "../../components/Money";
import EndMonth from "./EndMonth";
import { ColumnsType } from "antd/es/table";

const api = new AccountMonthApi();
const accountApi = new AccountApi();
const movementTypeApi = new MovementTypeApi();
const tagApi = new TagApi();

interface TableData {
  key: React.Key;
  date: ReactElement;
  description: ReactElement;
  amount: ReactElement;
  balance: ReactElement;
  sourceAccount?: Account;
  movementTypeId?: string;
  tags: TagDetail[];
}

export async function loader({ params }: LoaderFunctionArgs) {
  if (params.accountId === undefined) {
    throw new Error("missing/invalid account id parameter");
  }

  return Promise.all(
    [
      api.accountMonth(params.accountId),
      accountApi.account(params.accountId),
      accountApi.accounts(),
      movementTypeApi.movementTypesByAccountId(params.accountId),
      tagApi.tags()
    ]
  );
}

function getMovementsTableData(accountMonth: AccountMonth): TableData[] {
  const tableData: TableData[] = [];

  if (accountMonth.movements.length <= 0) {
    return tableData;
  }

  let currentBalance = accountMonth.initialBalance;
  let i = 0;
  accountMonth.movements.forEach((item) => {
    const startDate = new Date(item.date);

    let changeFactor = 1;
    if (item.action === "debit") {
      changeFactor = -1;
    }

    console.log(currentBalance);

    currentBalance = currentBalance + (item.amount * changeFactor);

    console.log(currentBalance, item.amount, changeFactor);

    tableData.unshift(
      {
        key: i,
        date: (
          <span>
          {startDate.getFullYear()}/{padValue(startDate.getMonth() + 1)}/{padValue(startDate.getDate())}
          </span>
        ),
        description: <span>{item.description}</span>,
        amount: <Money
          value={item.amount}
          currency={accountMonth.account.currency}
          negative={item.action === "debit"}
          showPositiveSymbol={true}
        />,
        balance: <Money value={currentBalance} currency={accountMonth.account.currency} />,
        sourceAccount: item.sourceAccount,
        movementTypeId: item.movementTypeId,
        tags: item.tags
      }
    );

    i++;
  });

  return tableData;
}

function renderMovementDetail(record: TableData): ReactNode {
  return <Row>
    <Col span={8}>{record.sourceAccount?.name || "No source account"}</Col>
    <Col span={8}>{record.movementTypeId || "No movement type associated"}</Col>
    <Col span={8}>
      {
        record.tags.map(
          tagDetail => {
            return <AntTag color="gray">{tagDetail.category}: {tagDetail.name}</AntTag>;
          }
        )
      }
    </Col>
  </Row>;
}

export default function Movements() {
  const [
    accountMonth,
    account,
    accounts,
    movementTypes,
    tagCategories
  ] = useLoaderData() as [AccountMonth, Account, Account[], MovementTypeApiResponse[], TagCategory[]];
  const [newMovementVisible, setNewMovementVisible] = useState(false);
  const [endMothVisible, setEndMonthVisible] = useState(false);

  const columns: ColumnsType<TableData> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right'
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right'
    }
  ];

  const showNewMovementModal = () => setNewMovementVisible(true);
  const hideNewMovementModal = () => setNewMovementVisible(false);

  const showEndMonthModal = () => setEndMonthVisible(true);
  const hideEndMonthModal = () => setEndMonthVisible(false);

  let buttons = [];

  const currentDate = new Date();
  if (currentDate.getFullYear() > accountMonth.activeMonth.year || (currentDate.getMonth() + 1) > accountMonth.activeMonth.month) {
    buttons.push(
      <Button key="2" onClick={showEndMonthModal} type="primary" size="middle"  className="btn-add_new" danger>
        <UilFileCheckAlt/>End month
      </Button>
    );
  }
  buttons.push(
    <Button key="1" onClick={showNewMovementModal} type="primary" size="middle" className="btn-add_new">
      <UilPlus /> Register movement
    </Button>
  );

  return (
    <>
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Movements"
          buttons={buttons}
        />
      </CardToolbox>
      <Main>
        <Row>
          <Col span={8}>
            <strong>Account:</strong> {account.name}
          </Col>
          <Col span={8}>
            <strong>Month:</strong> {accountMonth.activeMonth.year} / {accountMonth.activeMonth.month}
          </Col>
          <Col span={8}>
            <strong>Balance:</strong>
            <Money value={account.startingBalance} currency={account.currency}/>
          </Col>
        </Row>
        <Divider />
        <Cards headless>
          {accountMonth.movements.length > 0 ? (
            <Table
              bordered
              pagination={false}
              columns={columns}
              dataSource={getMovementsTableData(accountMonth)}
              expandable={{
                expandedRowRender: (record) => renderMovementDetail(record)
              }}
            />
          ) : (
            <div>No movements registered in this month</div>
          )}
        </Cards>
        <RegisterNewMovement
          onClose={hideNewMovementModal}
          visible={newMovementVisible}
          currentAccount={account}
          accounts={accounts}
          movementTypes={movementTypes}
          tagCategories={tagCategories}
        />
        <EndMonth
          onClose={hideEndMonthModal}
          visible={endMothVisible}
          account={account}
          accountMonth={accountMonth}
        />
      </Main>
    </>
  );
}
