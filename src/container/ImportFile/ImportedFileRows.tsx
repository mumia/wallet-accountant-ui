import React, { JSXElementConstructor, ReactElement, ReactNode, useState } from "react";
import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import { Button, Card, Col, message, Row, Table } from "antd";
import { Cards } from "../../components/cards/frame/cards-frame";
import { LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import ImportFileApi, { DataRowState, ImportFileRows, stringToDataStateRow } from "../../api/ImportFileApi";
import { showDate } from "../../config/dateHelper";
import AccountApi, { Account } from "../../api/AccountApi";
import Money from "../../components/Money";
import { ColumnsType } from "antd/es/table";
import VerifyImportedDataRow from "./VerifyImportedDataRow";
import MovementTypeApi, { MovementTypeApiResponse } from "../../api/MovementTypeApi";
import TagApi, { TagCategory } from "../../api/TagApi";
import { capitalizeFirstLetter } from "../../config/stringHelper";

interface TableData {
  key: React.Key;
  date: ReactElement;
  description: ReactElement;
  amount: ReactElement;
  action: ReactElement;
  rawData: Map<string, string>;
}

const api = new ImportFileApi();
const accountApi = new AccountApi();
const movementTypeApi = new MovementTypeApi();
const tagApi = new TagApi();

export async function loader({ params }: LoaderFunctionArgs) {
  if (params.importFileId === undefined) {
    throw new Error("missing/invalid import file id parameter");
  }
  if (params.accountId === undefined) {
    throw new Error("missing/invalid account id parameter");
  }

  return Promise.all(
    [
      api.importedFileRows(params.importFileId),
      accountApi.account(params.accountId),
      accountApi.accounts(),
      movementTypeApi.movementTypesByAccountId(params.accountId),
      tagApi.tags()
    ]
  );
}

function getImportedFileRowsTableData(
  importedFileRows: ImportFileRows,
  account: Account,
  showModal: (row: string) => void
): Map<DataRowState, TableData[]> {
  const tableData: Map<DataRowState, TableData[]> = new Map<DataRowState, TableData[]>();
  const unverified: TableData[] = [];
  const verified: TableData[] = [];
  const invalid: TableData[] = [];

  if (importedFileRows.rows.length <= 0) {
    return tableData;
  }

  let i = 0;
  importedFileRows.rows.forEach((item) => {
    const tableItem = {
      key: i,
      date: <span>{showDate(new Date(item.date))}</span>,
      description: <span>{item.description}</span>,
      amount: <span>
        {
          <Money
            value={item.amount}
            currency={account.currency}
            negative={item.amount < 0}
            showPositiveSymbol={true}
          />
        }
      </span>,
      action: <span><Button onClick={() => showModal(item.fileDataRowId)}>Verify</Button></span>,
      rawData: item.rawData
    };

    switch (item.state) {
      case DataRowState.UNVERIFIED:
        unverified.push(tableItem);
        break;

      case DataRowState.VERIFIED:
        verified.push(tableItem);
        break;

      case DataRowState.INVALID:
        invalid.push(tableItem);
        break;
    }

    i++;
  });

  tableData.set(DataRowState.UNVERIFIED, unverified);
  tableData.set(DataRowState.VERIFIED, verified);
  tableData.set(DataRowState.INVALID, invalid);

  return tableData;
}

function renderFileRow(record: TableData): ReactNode {
  const rawDataRows: ReactElement[] = [];

  for (const [key, value] of Object.entries(record.rawData)) {
    rawDataRows.push(
      <Row>
        <Col span={8}>{key}</Col>
        <Col span={16}>{value ? value : "N/D"}</Col>
      </Row>
    );
  }

  return <Cards title={"Raw imported data"} headless>{rawDataRows}</Cards>;
}

const ImportedFileRows = (): React.JSX.Element => {
  const [visibleRow, setVisibleRow] = useState("");
  const [activeTabKey, setActiveTabKey] = useState<DataRowState>(DataRowState.UNVERIFIED);
  const [
    importedFileRows,
    account,
    accounts,
    movementTypes,
    tagCategories
  ] = useLoaderData() as [ImportFileRows, Account, Account[], MovementTypeApiResponse[], TagCategory[]];
  const [messageApi, contextHolder] = message.useMessage();

  const api = new ImportFileApi();

  // const restartParse = async (importFileId: string) => {
  //   messageApi.open({
  //     type: "loading",
  //     content: "Restarting import file parsing..",
  //     duration: 0
  //   });
  //
  //   try {
  //     const success = await api.restartFileImportParser(importFileId);
  //
  //     if (success) {
  //       messageApi.destroy();
  //       messageApi.open({
  //         type: "success",
  //         content: "Import file parse restarted"
  //       });
  //     }
  //   } catch (error) {
  //     messageApi.destroy();
  //     if (error instanceof ApiError) {
  //       messageApi.open({
  //         type: "error",
  //         content: error.message()
  //       });
  //     } else {
  //       messageApi.open({
  //         type: "error",
  //         content: JSON.stringify(error)
  //       });
  //     }
  //   }
  // };

  const showModal = (row: string) => setVisibleRow(row);

  const hideModal = () => setVisibleRow("");

  const importedFileRowsTableData = getImportedFileRowsTableData(importedFileRows, account, showModal);

  const columns: ColumnsType<TableData> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date"
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description"
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right"
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action"
    }
  ];

  const unverifiedRows = importedFileRowsTableData.get(DataRowState.UNVERIFIED) || [];
  const verifiedRows = importedFileRowsTableData.get(DataRowState.VERIFIED) || [];
  const invalidRows = importedFileRowsTableData.get(DataRowState.INVALID) || [];

  const tabList = [
    {
      key: DataRowState.UNVERIFIED,
      label: `${capitalizeFirstLetter(DataRowState.UNVERIFIED)} (${unverifiedRows.length})`
    },
    {
      key: DataRowState.VERIFIED,
      label: `${capitalizeFirstLetter(DataRowState.VERIFIED)} (${verifiedRows.length})`
    },
    {
      key: DataRowState.INVALID,
      label: `${capitalizeFirstLetter(DataRowState.INVALID)} (${invalidRows.length})`
    }
  ];

  //
  // const refresh = () => navigate(".");

  // useWebSocket(
  //   WS_URL,
  //   WebSocketRunnerHelper("importFile", refresh)
  // );

  const anyRowsImported = unverifiedRows.length > 0 || verifiedRows.length > 0 || invalidRows.length > 0;

  const tabContent = function(data: TableData[], message:string) {
    return data.length > 0 ? (
      <Table
        bordered
        pagination={false}
        dataSource={data}
        columns={columns}
        expandable={{
          expandedRowRender: (record) => renderFileRow(record)
        }}
      />
    ) : anyRowsImported ? (<div>{message}</div>) : (<div>No file rows imported</div>)
  }

  const tabs: Map<DataRowState, ReactNode> = new Map();
  tabs.set(DataRowState.UNVERIFIED, tabContent(unverifiedRows, 'No more rows to verify'));
  tabs.set(DataRowState.VERIFIED, tabContent(verifiedRows, 'No rows verified, yet'));
  tabs.set(DataRowState.INVALID, tabContent(invalidRows, 'No rows invalidated, yet'));

  return (
    <>
      {contextHolder}
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="Import file rows"
          subTitle={<>{unverifiedRows.length} file rows</>}
        />
      </CardToolbox>
      <Main>
        <Cards headless>
          <Card
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={key => setActiveTabKey(stringToDataStateRow(key))}
          >
            {tabs.get(activeTabKey)}
          </Card>
        </Cards>
        {importedFileRows.rows.map((row) => {
          return (
            <VerifyImportedDataRow
              onClose={hideModal}
              importFileId={importedFileRows.importFileId}
              importedFileDataRow={row}
              visibleRow={visibleRow}
              currentAccount={account}
              accounts={accounts}
              movementTypes={movementTypes}
              tagCategories={tagCategories}
            />
          );
        })}

      </Main>
    </>
  );
};

export default ImportedFileRows;
