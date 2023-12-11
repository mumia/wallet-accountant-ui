import React, { ReactElement, useState } from "react";
import { Button, Table } from "antd";
import { CardToolbox, Main } from "../styled";
import { useLoaderData, useNavigate } from "react-router-dom";
import { UilPlus } from "@iconscout/react-unicons";
import { PageHeader } from "../../components/page-headers/page-headers";
import { Cards } from "../../components/cards/frame/cards-frame";
import RegisterAccount from "./RegisterAccount";
import AccountApi, { Account } from "../../api/AccountApi";
import { WebSocketRunnerHelper, WS_URL } from "../../layout/WebSocketRunner";
import useWebSocket from "react-use-websocket";

interface TableData {
  name: ReactElement;
  bank: ReactElement;
  type: ReactElement;
  startBalance: ReactElement;
  activeMonth: ReactElement;
  notes: ReactElement;
}

const api = new AccountApi();

export async function loader() {
  return api.accounts();
}

function padValue(value: string | number) {
  return String(value).padStart(2, "0");
}

function getAccountsTableData(accounts: Account[]): TableData[] {
  const tableData: TableData[] = [];

  if (accounts.length <= 0) {
    return tableData;
  }

  accounts.forEach((item) => {
    const startDate = new Date(item.startingBalanceDate);

    tableData.push({
      name: <span>{item.name}</span>,
      bank: <span>{item.bankName}</span>,
      type: <span>{item.accountType === 1 ? "Checking" : "Savings"}</span>,
      startBalance: (
        <span>
            {item.startingBalance} {item.currency} on {startDate.getFullYear()}/{padValue(startDate.getMonth() + 1)}/
          {padValue(startDate.getDate())}
          </span>
      ),
      activeMonth: (
        <span>
            {item.activeMonth.year}/{padValue(item.activeMonth.month)}
          </span>
      ),
      notes: <span>{item.notes}</span>
    });
  });

  return tableData;
}

const Accounts = (): React.JSX.Element => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const accounts = useLoaderData() as Account[];
  const accountsTableData = getAccountsTableData(accounts);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name"
    },
    {
      title: "Bank",
      dataIndex: "bank",
      key: "bank"
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type"
    },
    {
      title: "Start balance",
      dataIndex: "startBalance",
      key: "startBalance"
    },
    {
      title: "Active month",
      dataIndex: "activeMonth",
      key: "activeMonth"
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes"
    }
  ];

  const showModal = () => setVisible(true);

  const hideModal = () => setVisible(false);

  const refresh = () => navigate(".");

  useWebSocket(
    WS_URL,
    WebSocketRunnerHelper("account", refresh)
  );

  return (
    <>
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Accounts"
          subTitle={<>{accountsTableData.length} accounts</>}
          buttons={[
            <Button onClick={showModal} key="1" type="primary" size="middle" className="btn-add_new">
              <UilPlus /> Register account
            </Button>
          ]}
        />
      </CardToolbox>
      <Main>
        <Cards headless>
          {accountsTableData.length > 0 ? (
            <Table pagination={false} dataSource={accountsTableData} columns={columns} />
          ) : (
            <div>No accounts registered</div>
          )}
        </Cards>
        <RegisterAccount onClose={hideModal} visible={visible} />
      </Main>
    </>
  );
};

export default Accounts;
