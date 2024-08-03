import { DataService } from "../config/dataService";
import { handleDatesInCollection } from "../config/dateHelper";
import { HttpStatusCode } from "axios";

export enum State {
  IMPORTED = "imported",
  PARSING_STARTED = "parsingStarted",
  PARSING_RESTARTED = "parsingRestarted",
  PARSING_ENDED = "parsingEnded",
  PARSING_FAILED = "parsingFailed",
}

export enum DataRowState {
  UNVERIFIED = "unverified",
  VERIFIED = "verified",
  INVALID = "invalid"
}

export function stringToDataStateRow(state: string): DataRowState {
  switch (state) {
    case DataRowState.UNVERIFIED.toString():
      return DataRowState.UNVERIFIED;

    case DataRowState.VERIFIED.toString():
      return DataRowState.VERIFIED;

    case DataRowState.INVALID.toString():
      return DataRowState.INVALID;
  }

  return DataRowState.UNVERIFIED
}

export type ImportFile = {
  importFileId: string
  accountId: string
  filename: string
  fileType: string
  importDate: Date
  startParseDate: Date
  endParseDate: Date
  failParseDate: Date
  state: State
  code: string
  reason: string
  rowCount: number
}

export type ImportFileRows = {
  importFileId: string
  accountId: string
  filename: string
  rowCount: number
  rows: FileDataRow[]
}

export type FileDataRow = {
  fileDataRowId: string
  date: Date
  description: string
  amount: number
  rawData: Map<string, string>
  state: DataRowState
}

export type RegisterImportFile = {
  accountId: string
  filename: File
}

export type VerifyImportedDataRow = {
  importFileId: string,
  fileDataRowId: string,
  movementTypeId?: string
  sourceAccountId?: string
  description: string
  tagIds: string[]
}

export type InvalidateImportedDataRow = {
  importFileId: string,
  fileDataRowId: string,
  reason: string
}

export default class ImportFileApi extends DataService {
  async importedFiles(): Promise<ImportFile[]> {
    const response = await this.client
      .get<ImportFile[]>("/import-files")
      .then(
        (response) => {
          response.data = handleDatesInCollection(response.data);

          return response;
        }
      );

    return response.data;
  }

  async importedFileRows(importFileId: string): Promise<ImportFileRows> {
    const response = await this.client
      .get<ImportFileRows>("/import-file/" + importFileId + "/rows");

    return response.data;
  }

  async restartFileImportParser(importFileId: string): Promise<boolean> {
    const response = await this.client
      .get<ImportFile[]>("/import-file/" + importFileId + "/restart");

    return response.status === HttpStatusCode.NoContent;
  }

  async registerImportFile(importFile: RegisterImportFile): Promise<boolean> {
    const config = {
      "headers": {
        "content-type": "multipart/form-data"
      }
    };

    const response = await this.client.post("/import-file", importFile, config);

    return response.status === HttpStatusCode.Created;
  }

  async verifyImportedDataRow(
    importFileId: string,
    fileDataId: string,
    dataRowVerification: VerifyImportedDataRow
  ): Promise<boolean> {
    dataRowVerification.importFileId = importFileId;
    dataRowVerification.fileDataRowId = fileDataId;

    const response = await this.client
      .post("/import-file/data-row/verify", dataRowVerification);

    return response.status === HttpStatusCode.NoContent;
  }

  async invalidateImportedDataRow(
    importFileId: string,
    fileDataId: string,
    invalidateDataRow: InvalidateImportedDataRow
  ): Promise<boolean> {
    invalidateDataRow.importFileId = importFileId;
    invalidateDataRow.fileDataRowId = fileDataId;

    const response = await this.client
      .post("/import-file/data-row/invalidate", invalidateDataRow);

    return response.status === HttpStatusCode.NoContent;
  }
}