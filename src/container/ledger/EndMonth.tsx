import { Button, Form, InputNumber, message, Modal } from "antd";
import { writeOperationHelper } from "../../config/dataService";
import LedgerApi, { Ledger } from "../../api/LedgerApi";
import { Account } from "../../api/AccountApi";
import React, { useState } from "react";
import Money from "../../components/Money";
import { UilCheck } from "@iconscout/react-unicons";

type Control = {
  onClose: () => void;
  visible: boolean;
  account: Account,
  ledger: Ledger,
};

export default function EndMonth(
  {
    onClose,
    visible,
    account,
    ledger
  }: Control
) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [difference, setDifference] = useState<number | null>(null);

  const handleOk = async () => {
    const api = new LedgerApi();
    const endMonth = form.getFieldsValue();

    await writeOperationHelper(
      messageApi,
      "Ending current month ledger...",
      "Current month successfully ended",
      () => api.endMonth(account, endMonth),
      onClose
    );
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleEndBalanceChange = (value: number | string | null) => {
    if (value == null || typeof value === "string") {
      setDifference(null);

      return;
    }

    setDifference(value - ledger.balance);
  };

  return (
    <Modal
      title={`Register movement for account "${account.name}"`}
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
        name="endMonth"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item label={`Month ending`}>
          {account.activeMonth.year}/{account.activeMonth.month}
        </Form.Item>
        <Form.Item label={`Calculated balance (${account.currency})`} style={{display: "table-row"}}>
          <div style={{display: "table-cell", verticalAlign: "middle"}}>
            <Money value={ledger.balance} currency={account.currency} />
          </div>
          <div style={{display: "table-cell"}}>
            {
              difference !== null && (
                difference !== 0
                  ? <>&nbsp;(
                    <Money
                      value={difference}
                      currency={account.currency}
                      showPositiveSymbol
                    />
                    )</>
                  : <UilCheck />
              )
            }
          </div>
        </Form.Item>
        <Form.Item
          name="endBalance"
          label={`Verified end of month balance (${account.currency})`}
          rules={
            [
              { required: true, message: "Please fill in the end of month balance!" },
              {
                validator: (_, value) => value === undefined || value === null || value === ledger.balance
                  ? Promise.resolve()
                  : Promise.reject(new Error("Verified end of month balance mismatch"))
              }
            ]
          }
        >
          <InputNumber placeholder={`Balance (${account.currency})`} onChange={handleEndBalanceChange} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
