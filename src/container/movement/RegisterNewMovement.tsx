import { Button, Checkbox, Col, DatePicker, Form, Input, InputNumber, message, Modal, Row, Select } from "antd";
import { writeOperationHelper } from "../../config/dataService";
import { MovementTypeApiResponse } from "../../api/MovementTypeApi";
import AccountMonthApi from "../../api/AccountMonthApi";
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
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOk = async () => {
    const api = new AccountMonthApi();
    const newMovement = form.getFieldsValue();

    await writeOperationHelper(
      messageApi,
      "Registering new account movement...",
      "Account movement successfully registered",
      () => api.registerNewAccountMovement(currentAccount.accountId, newMovement),
      onClose
    );
  };

  const handleClose = () => {
    onClose();
  };

  dayjs.extend(customParseFormat);

  const disabledDate: RangePickerProps["disabledDate"] = (current) => {
    const date = dayjs()
      .month(currentAccount.activeMonth.month - 1)
      .year(currentAccount.activeMonth.year);

    return current < date.startOf("month") || current >= date.endOf("month");
  };

  const startDate = currentAccount.activeMonth.year + "-" + currentAccount.activeMonth.month;

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
    >
      {contextHolder}
      <Form
        form={form}
        name="registerMovement"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item name="movementTypeId" label="Movement type">
          {movementTypes == null || movementTypes.length <= 0
            ? (<span>No movement types registered. <Link
              to={"/admin/movement-types"}>Manage movement types</Link></span>)
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

        <Form.Item
          name="action"
          label="Action"
          rules={[{ required: true, message: "Please select an action!" }]}
        >
          <Select
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
          rules={[{ required: true, message: "Please fill in the description!" }]}
        >
          <Input placeholder="Description" />
        </Form.Item>

        <Form.Item
          name="amount"
          label={`Amount (${currentAccount.currency})`}
          rules={[{ required: true, message: "Please fill in the amount!" }]}
        >
          <InputNumber placeholder={`Amount (${currentAccount.currency})`} />
        </Form.Item>

        <Form.Item
          name="date"
          label="Date"
          rules={[{ required: true, message: "Please pick a date!" }]}
        >
          <DatePicker
            placeholder="yyyy/mm/dd"
            format="YYYY/MM/DD"
            showToday={false}
            disabledDate={disabledDate}
            defaultValue={dayjs(startDate, "YYYY-MM")}
          />
        </Form.Item>

        <Form.Item
          name="tagIds"
          label="TagIds"
          rules={[{ required: true, message: "Please select at least one tag!" }]}
        >
          <Checkbox.Group style={{width: "100%"}}>
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

        <Form.Item
          name="sourceAccountId"
          label="Source/Target account"
        >
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
      </Form>
    </Modal>
  );
}
