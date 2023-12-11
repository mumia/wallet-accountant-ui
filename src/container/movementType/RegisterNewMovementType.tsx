import { Button, Checkbox, Col, Form, Input, message, Modal, Select } from "antd";
import MovementTypeApi, { AccountDetail } from "../../api/MovementTypeApi";
import { Account } from "../../api/AccountApi";
import { TagCategory } from "../../api/TagApi";
import React, { useState } from "react";
import CheckableTag from "antd/es/tag/CheckableTag";
import { ApiError, writeOperationHelper } from "../../config/dataService";

type ModalProps = {
  onClose: () => void,
  visible: boolean,
  currentAccount: AccountDetail,
  accounts: Account[]
  tagCategories: TagCategory[]
}

export default function RegisterNewMovementType(
  {
    onClose,
    visible,
    currentAccount,
    accounts,
    tagCategories
  }: ModalProps
) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOk = async () => {
    const api = new MovementTypeApi();
    const newMovementType = form.getFieldsValue();

    await writeOperationHelper(
      messageApi,
      "Registering new movement type...",
      "Movement type successfully registered",
      () => api.registerMovementType(currentAccount.accountId, newMovementType),
      onClose
    );
  };

  const setTagSelectionState = (tagId: string, checked: boolean) => {
    const nextSelectedTags = checked
      ? [...selectedTags, tagId]
      : selectedTags.filter((t) => t !== tagId);

    setSelectedTags(nextSelectedTags);

    form.setFieldValue("tags", nextSelectedTags);
  };

  return (
    <Modal
      title={`Register new movement type for "${currentAccount.name}"`}
      open={visible}
      footer={[
        <div className="form-footer">
          <Button size="large" type="primary" key="submit" onClick={form.submit}>
            Register
          </Button>
          <Button size="large" type="default" key="back" onClick={onClose}>
            Cancel
          </Button>
        </div>
      ]}
      onCancel={onClose}
    >
      {contextHolder}
      <Form
        form={form}
        name="addTagCategory"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="type"
          label="Type"
          rules={[{ required: true, message: "Please select a type!" }]}
        >
          <Select
            placeholder="Type"
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
          name="tags"
          label="Tags"
          rules={[{ required: true, message: "Please select at least one tag!" }]}
        >
          <Checkbox.Group>
            {tagCategories.map(tagCategory =>
              <>
                <Col span={24} style={{ borderBottom: "1px solid #ccc" }}>{tagCategory.name}</Col>
                {tagCategory.tags.map((tag, index) =>
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
              </>
            )}
          </Checkbox.Group>
        </Form.Item>

        <Form.Item
          name="sourceAccountId"
          label="Source/Target account"
        >
          <Select
            placeholder="Source/Target account"
            defaultValue={""}
            options={
              [{ value: "", label: "None" }].concat(
                accounts
                  .filter(account => account.accountId !== currentAccount.accountId)
                  .map(account => {
                    return { value: account.accountId, label: account.name };
                  })
              )
            }
          />
        </Form.Item>

        <Form.Item name="notes" label="notes" initialValue={``}>
          <Input.TextArea rows={2} placeholder="Notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}