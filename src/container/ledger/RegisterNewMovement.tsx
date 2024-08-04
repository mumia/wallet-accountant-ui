import { Button, Checkbox, Col, DatePicker, Form, Input, InputNumber, message, Modal, Row, Select } from "antd";
import { writeOperationHelper } from "../../config/dataService";
import { MovementTypeApiResponse } from "../../api/MovementTypeApi";
import LedgerApi, { NewAccountMovement } from "../../api/LedgerApi";
import { Account } from "../../api/AccountApi";
import { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useState } from "react";
import CheckableTag from "antd/es/tag/CheckableTag";
import { TagCategory } from "../../api/TagApi";
import { Link } from "react-router-dom";

type Control = {
  onClose: () => void;
  visible: boolean;
  currentAccount: Account,
  accounts: Account[],
  movementTypes: MovementTypeApiResponse[],
  tagCategories: TagCategory[],
};

export default function RegisterNewMovement(
  {
    onClose,
    visible,
    currentAccount,
    accounts,
    movementTypes,
    tagCategories
  }: Control
) {
  const [form] = Form.useForm<NewAccountMovement>();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOk = async () => {
    const api = new LedgerApi();
    const newMovement = form.getFieldsValue();

    newMovement.amount = newMovement.amount * 100;

    await writeOperationHelper(
      messageApi,
      "Registering new account ledger...",
      "Account ledger successfully registered",
      () => api.registerNewAccountMovement(currentAccount.accountId, newMovement),
      onClose
    );
  };

  const handleClose = () => {
    onClose();
  };

  dayjs.extend(customParseFormat);


  const currentDate = dayjs()
    .month(currentAccount.activeMonth.month - 1)
    .year(currentAccount.activeMonth.year);

  const setTagSelectionState = (tagId: string, checked: boolean) => {
    const nextSelectedTags = checked
      ? [...selectedTags, tagId]
      : selectedTags.filter((t) => t !== tagId);

    setSelectedTags(nextSelectedTags);

    form.setFieldValue("tagIds", nextSelectedTags);
  };

  accounts = accounts.filter(account => account.accountId !== currentAccount.accountId);

  return (
    <Modal
      title={`Register movement for account "${currentAccount.name}"`}
      open={visible}
      footer={[
        <div className="form-footer">
          <Button size="large" type="primary" key="submit" onClick={form.submit}>
            Register
          </Button>
          <Button size="large" type="default" key="back" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      ]}
      onCancel={handleClose}
      key={"registerMovementModal"}
    >
      {contextHolder}
      <Form
        form={form}
        name="registerMovement"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
        key={"rmf"}
      >
        <Form.Item
          name="movementTypeId"
          label="Movement type"
          key={"rmfMovementTypeId"}
        >
          {movementTypes == null || movementTypes.length <= 0
            ? (<span>No movement types registered. <Link
              to={"/admin/ledger-types"}>Manage movement types</Link></span>)
            : (
              <Select
                key={"rmfMovementTypeIdSelect"}
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

        <Form.Item
          name="action"
          label="Action"
          key={"rmfAction"}
          rules={[{ required: true, message: "Please select an action!" }]}
        >
          <Select
            key={"rmfActionSelect"}
            placeholder="Action"
            options={[
              { value: "debit", label: "Debit" },
              { value: "credit", label: "Credit" }
            ]}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          key={"rmfDescription"}
          rules={[{ required: true, message: "Please fill in the description!" }]}
        >
          <Input key={"rmfDescriptionInput"} placeholder="Description" />
        </Form.Item>

        <Form.Item
          name="amount"
          label={`Amount (${currentAccount.currency})`}
          key={"rmfAmount"}
          rules={[{ required: true, message: "Please fill in the amount!" }]}
        >
          <InputNumber key={"rmfAmountAmount"} placeholder={`Amount (${currentAccount.currency})`} />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          key={"rmfDate"}
          rules={[{ required: true, message: "Please pick a date!" }]}
        >
          <DatePicker
            key={"rmfDatePicker"}
            placeholder="yyyy/mm/dd"
            format="YYYY/MM/DD"
            showToday={false}
            minDate={currentDate.startOf("month")}
            maxDate={currentDate.endOf("month")}
            // defaultValue={currentDate.startOf("month")}
          />
        </Form.Item>

        <Form.Item
          name="tagIds"
          label="TagIds"
          key={"rmfTagIds"}
          rules={[{ required: true, message: "Please select at least one tag!" }]}
        >
          <Checkbox.Group key={"rmfTagIdsCheckbox"} style={{ width: "100%" }}>
            {tagCategories.map(tagCategory =>
              <Row key={"rmfticRow" + tagCategory.tagCategoryId}>
                <Col
                  key={"rmfticCol" + tagCategory.tagCategoryId}
                  span={24}
                  style={{ borderBottom: "1px solid #ccc" }}
                >
                  {tagCategory.name}
                </Col>
                {tagCategory.tags.map((tag) =>
                  <Col key={"rmfticRow" + tag.tagId} span={6} offset={1}>
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

        <Form.Item
          name="sourceAccountId"
          label="Source/Target account"
          key={"rmfSourceAccountId"}
        >
          {accounts == null || accounts.length <= 0
            ? (<span>No other accounts. <Link to={"/admin/accounts"}>Manage accounts</Link></span>)
            : (
              <Select
                key={"rmfSourceAccountIdSelect"}
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
      </Form>
    </Modal>
  );
}
