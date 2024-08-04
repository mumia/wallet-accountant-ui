import { Button, Checkbox, Col, Form, Input, message, Modal, Select } from "antd";
import MovementTypeApi, { NewMovementTypeCreate } from "../../api/MovementTypeApi";
import { Account } from "../../api/AccountApi";
import { TagCategory } from "../../api/TagApi";
import React, { useState } from "react";
import CheckableTag from "antd/es/tag/CheckableTag";
import { writeOperationHelper } from "../../config/dataService";
import { Link } from "react-router-dom";

type ModalProps = {
  onClose: () => void,
  visible: boolean,
  currentAccount: Account,
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
  const [form] = Form.useForm<NewMovementTypeCreate>();
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleOk = async () => {
    const api = new MovementTypeApi();
    const newMovementType = form.getFieldsValue();

    await writeOperationHelper(
      messageApi,
      "Registering new ledger type...",
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

    form.setFieldValue("tagIds", nextSelectedTags);
  };

  accounts = accounts.filter(account => account.accountId !== currentAccount.accountId);

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
          name="tagIds"
          label="TagIds"
          rules={[{ required: true, message: "Please select at least one tag!" }]}
        >
          <Checkbox.Group style={{width: "100%"}}>
            {tagCategories.map(tagCategory =>
              <>
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
              </>
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

        <Form.Item name="notes" label="notes" initialValue={``}>
          <Input.TextArea rows={2} placeholder="Notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}