import {
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space
} from "antd";
import { writeOperationHelper } from "../../config/dataService";
import { MovementTypeApiResponse } from "../../api/MovementTypeApi";
import { Account } from "../../api/AccountApi";
import React, { ReactElement, useState } from "react";
import CheckableTag from "antd/es/tag/CheckableTag";
import { TagCategory } from "../../api/TagApi";
import { Link } from "react-router-dom";
import ImportFileApi, { FileDataRow } from "../../api/ImportFileApi";
import { showDate } from "../../config/dateHelper";

type Control = {
  onClose: () => void;
  visibleRow: string;
  importFileId: string,
  importedFileDataRow: FileDataRow,
  currentAccount: Account,
  accounts: Account[],
  movementTypes: MovementTypeApiResponse[],
  tagCategories: TagCategory[],
};

export default function VerifyImportedDataRow(
  {
    onClose,
    visibleRow,
    importFileId,
    importedFileDataRow,
    currentAccount,
    accounts,
    movementTypes,
    tagCategories
  }: Control
) {
  const [markInvalidOpen, setMarkInvalidOpen] = useState(false);
  const [form] = Form.useForm();
  const [markInvalidForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOk = async () => {
    const api = new ImportFileApi();
    const verifiedDataRow = form.getFieldsValue();

    await writeOperationHelper(
      messageApi,
      "Verifying imported data row...",
      "Imported data row successfully verified",
      () => api.verifyImportedDataRow(importFileId, importedFileDataRow.fileDataRowId, verifiedDataRow),
      onClose
    );
  };

  const handleClose = () => {
    setMarkInvalidOpen(false);

    onClose();
  };

  const handleInvalidOk = async () => {
    const api = new ImportFileApi();
    const invalidatedDataRow = markInvalidForm.getFieldsValue();

    await writeOperationHelper(
      messageApi,
      "Invalidating imported data row...",
      "Imported data row successfully invalidated",
      () => api.invalidateImportedDataRow(
        importFileId,
        importedFileDataRow.fileDataRowId,
        invalidatedDataRow
      ),
      onClose
    );
  };

  const handleInvalidClose = () => {
    setMarkInvalidOpen(false);
  };

  const setTagSelectionState = (tagId: string, checked: boolean) => {
    const nextSelectedTags = checked
      ? [...selectedTags, tagId]
      : selectedTags.filter((t) => t !== tagId);

    setSelectedTags(nextSelectedTags);

    form.setFieldValue("tagIds", nextSelectedTags);
  };

  accounts = accounts.filter(account => account.accountId !== currentAccount.accountId);

  const rawDataRows: ReactElement[] = [];
  for (const [key, value] of Object.entries(importedFileDataRow.rawData)) {
    rawDataRows.push(
      <Row>
        <Col span={8}>{key}</Col>
        <Col span={16}>{value ? value : "N/D"}</Col>
      </Row>
    );
  }

  return (
    <>
      <Modal
        title={`Verify imported movement for account "${currentAccount.name}"`}
        open={visibleRow === importedFileDataRow.fileDataRowId}
        centered
        footer={[
          <Button size="large" type="primary" key="submit" onClick={form.submit}>
            Save
          </Button>,
          <Button size="large" danger key="invalid" onClick={() => setMarkInvalidOpen(true)}>
            Invalid
          </Button>,
          <Button size="large" type="default" key="back" onClick={handleClose}>
            Cancel
          </Button>
        ]}
        onCancel={handleClose}
        afterClose={() => setMarkInvalidOpen(false)}
        width={1000}
      >
        {contextHolder}
        <Form
          key={importedFileDataRow.fileDataRowId}
          form={form}
          name="registerMovement"
          onFinish={handleOk}
          layout="vertical"
          autoComplete="off"
          initialValues={{
            description: importedFileDataRow.description
          }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Row gutter={8} style={{ marginBottom: "10px" }}>
                <Col span={8}>
                  <Form.Item name="action" label="Action">
                    <Input
                      disabled
                      style={{ color: "rgba(0, 0, 0, 0.5)" }}
                      defaultValue={importedFileDataRow.amount > 0 ? "Credit" : "Debit"}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="amount" label={`Amount (${currentAccount.currency})`}>
                    <InputNumber
                      disabled
                      style={{ color: "rgba(0, 0, 0, 0.5)" }}
                      placeholder={`Amount (${currentAccount.currency})`}
                      defaultValue={Math.abs(importedFileDataRow.amount)}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="date" label="Date">
                    <Input
                      disabled
                      style={{ color: "rgba(0, 0, 0, 0.5)" }}
                      defaultValue={showDate(new Date(importedFileDataRow.date))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: "Please fill in the description!" }]}
              >
                <Input placeholder="Description"/>
              </Form.Item>

              <Form.Item
                name="tagIds"
                label="Tags"
                rules={[{ required: true, message: "Please select at least one tag!" }]}
              >
                <Checkbox.Group style={{ width: "100%" }}>
                  {tagCategories.map(tagCategory =>
                    <Row>
                      <Col span={24} style={{ borderBottom: "1px solid #ccc" }}>{tagCategory.name}</Col>
                      {tagCategory.tags.map((tag) =>
                        <Col span={6} offset={1}>
                          <CheckableTag
                            key={tag.tagId}
                            checked={selectedTags.includes(tag.tagId)}
                            onChange={(checked) => setTagSelectionState(tag.tagId, checked)}
                          >
                            {tag.name}
                          </CheckableTag>
                        </Col>
                      )}
                    </Row>
                  )}
                </Checkbox.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="movementTypeId" label="Movement type">
                {movementTypes == null || movementTypes.length <= 0
                  ? (<span>No movement types registered. <Link
                    to={"/admin/ledger-types"}>Manage movement types</Link></span>)
                  : (
                    <Select
                      placeholder="No movement type associated"
                      options={movementTypes && movementTypes.map(
                        movementType => {
                          return {
                            value: movementType.movementTypeId,
                            label: movementType.description
                          };
                        }
                      )}
                    />
                  )
                }
              </Form.Item>

              <Form.Item name="sourceAccountId" label="Source/Target account">
                {accounts == null || accounts.length <= 0
                  ? (<span>No other accounts. <Link to={"/admin/accounts"}>Manage accounts</Link></span>)
                  : (
                    <Select
                      placeholder="Source/Target account"
                      defaultValue={""}
                      options={
                        [{ value: "", label: "None" }].concat(
                          accounts.map(
                            account => {
                              return { value: account.accountId, label: account.name };
                            }
                          )
                        )
                      }
                    />
                  )
                }
              </Form.Item>

              <Card size={"small"} title={"Raw imported data"}>
                {rawDataRows}
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>
      <Drawer title="Mark movement as invalid" mask={false} onClose={onClose} open={markInvalidOpen}>
        <Row>
          <Col span={24}>
            <Form
              key={importedFileDataRow.fileDataRowId + "invalid"}
              form={markInvalidForm}
              name="markMovementInvalid"
              onFinish={handleInvalidOk}
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item
                name="reason"
                label="Reason"
                rules={[{ required: true, message: "Please fill in the reason!" }]}
              >
                <Input placeholder="Reason" />
              </Form.Item>
            </Form>
          </Col>
        </Row>
        <Row>
          <Col span={24} style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <Space>
              <Button size="large" type="primary" danger key="submit" onClick={markInvalidForm.submit}>
                Invalid
              </Button>
              <Button size="large" type="default" key="back" onClick={handleInvalidClose}>
                Cancel
              </Button>
            </Space>
          </Col>
        </Row>
      </Drawer>
    </>
  );
}
