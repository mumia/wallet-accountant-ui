import React, { ReactElement, useState } from "react";
import { CardToolbox, Main } from "../../container/styled";
import { PageHeader } from "../../components/page-headers/page-headers";
import { Button, message, Table } from "antd";
import { Cards } from "../../components/cards/frame/cards-frame";
import { Link, NavigateFunction, useLoaderData, useNavigate } from "react-router-dom";
import ImportFileApi, { ImportFile, State } from "../../api/ImportFileApi";
import { showDateWithTime } from "../../config/dateHelper";
import RegisterNewImportFile from "./RegisterNewImportFile";
import useWebSocket from "react-use-websocket";
import { WebSocketRunnerHelper, WS_URL } from "../../layout/WebSocketRunner";
import { UilPlus } from "@iconscout/react-unicons";
import AccountApi, { Account } from "../../api/AccountApi";
import { ApiError } from "../../config/dataService";

interface TableData {
  account: ReactElement;
  filename: ReactElement;
  fileType: ReactElement;
  state: ReactElement;
  actions: ReactElement;
}

const api = new ImportFileApi();
const accountApi = new AccountApi();

export async function loader() {
  return Promise.all([api.importedFiles(), accountApi.accounts()]);
}

function getImportedFilesTableData(
  importedFiles: ImportFile[],
  accountNames: Map<string, string>,
  restartParse: (importFileId: string) => void
): TableData[] {
  const tableData: TableData[] = [];

  if (importedFiles.length <= 0) {
    return tableData;
  }

  importedFiles.forEach((item) => {
    const state: ReactElement[] = [];
    switch (item.state) {
      case State.IMPORTED:
        state.push(<li>Imported on {showDateWithTime(item.importDate)}</li>);
        break;

      case State.PARSING_STARTED:
        state.push(<li>Parsing started on {showDateWithTime(item.startParseDate)}</li>);
        break;

      case State.PARSING_RESTARTED:
        state.push(<li>Parsing restarted on {showDateWithTime(item.startParseDate)}</li>);
        break;

      case State.PARSING_ENDED:
        state.push(<li>Parsing ended on {showDateWithTime(item.endParseDate)}</li>);
        break;

      case State.PARSING_FAILED:
        state.push(<li>Parsing failed on {showDateWithTime(item.failParseDate)}</li>);
        state.push(<li>{item.reason} ({item.code}</li>);
        break;
    }

    const actions: ReactElement[] = [];
    switch (item.state) {
      case State.PARSING_FAILED:
        actions.push(<Link to="." onClick={() => restartParse(item.importFileId)}>Restart</Link>);
        break;

      case State.PARSING_ENDED:
        actions.push(<Link to={`${item.importFileId}/${item.accountId}`}>Rows ({item.rowCount})</Link>);
        break;
    }

    tableData.push({
      account: <span>{item.accountId}{accountNames.get(item.accountId)}</span>,
      filename: <span>{item.filename}</span>,
      fileType: <span>{item.fileType}</span>,
      state: <ul>{state}</ul>,
      actions: <ul>{actions}</ul>
    });
  });

  return tableData;
}

const ImportedFiles = (): React.JSX.Element => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const [importedFiles, accounts] = useLoaderData() as [ImportFile[], Account[]];
  const [messageApi, contextHolder] = message.useMessage();

  const accountNames: Map<string, string> = new Map();
  accounts.forEach((account) => accountNames.set(account.accountId, `${account.name} (${account.bankName})`));

  const api = new ImportFileApi();

  const restartParse = async (importFileId: string) => {
    messageApi.open({
      type: "loading",
      content: "Restarting import file parsing..",
      duration: 0
    });

    try {
      const success = await api.restartFileImportParser(importFileId);

      if (success) {
        messageApi.destroy();
        messageApi.open({
          type: "success",
          content: "Import file parse restarted"
        });
      }
    } catch (error) {
      messageApi.destroy();
      if (error instanceof ApiError) {
        messageApi.open({
          type: "error",
          content: error.message()
        });
      } else {
        messageApi.open({
          type: "error",
          content: JSON.stringify(error)
        });
      }
    }
  };

  const importedFilesTableData = getImportedFilesTableData(importedFiles, accountNames, restartParse);

  const columns = [
    {
      title: "Account",
      dataIndex: "account",
      key: "account"
    },
    {
      title: "Filename",
      dataIndex: "filename",
      key: "filename"
    },
    {
      title: "FileType",
      dataIndex: "fileType",
      key: "fileType"
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state"
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions"
    },
  ];

  const showModal = () => setVisible(true);

  const hideModal = () => setVisible(false);

  const refresh = () => navigate(".");

  useWebSocket(
    WS_URL,
    WebSocketRunnerHelper("importFile", refresh)
  );

  return (
    <>
      {contextHolder}
      <CardToolbox>
        <PageHeader
          className="ninjadash-page-header-main"
          ghost
          title="File imports"
          subTitle={<>{importedFilesTableData.length} file imports</>}
          buttons={[
            <Button onClick={showModal} key="1" type="primary" size="middle" className="btn-add_new">
              <UilPlus /> Import file
            </Button>
          ]}
        />
      </CardToolbox>
      <Main>
        <Cards headless>
          {importedFilesTableData.length > 0 ? (
            <Table pagination={false} dataSource={importedFilesTableData} columns={columns} />
          ) : (
            <div>No files imported</div>
          )}
        </Cards>
        <RegisterNewImportFile onClose={hideModal} visible={visible} accountNames={accountNames} />
      </Main>
    </>
  );
};

export default ImportedFiles;
