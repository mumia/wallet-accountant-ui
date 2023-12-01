import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Select } from "antd";
import AccountApi from "../../api/AcountApi";
import { ApiError } from "../../config/dataService";

type Control = {
  onClose: () => void;
  visible: boolean;
};

export default function RegisterAccount({ onClose, visible }: Control) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const handleOk = async () => {
    messageApi.open({
      type: "loading",
      content: "Registering account..",
      duration: 0
    });

    const api = new AccountApi();

    try {
      const account = form.getFieldsValue()
      const success = await api.registerAccount(account);

      if (success) {
        messageApi.destroy();
        messageApi.open({
          type: "success",
          content: "Account registered"
        });

        onClose();
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

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title="Register account"
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
        name="registerAccount"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item name="accountType" label="Account type"
                   rules={[{ required: true, message: "Please select an account type!" }]}>
          <Select
            placeholder="Account type"
            options={[
              { value: 1, label: "Checking" },
              { value: 2, label: "Savings" }
            ]}
          />
        </Form.Item>
        <Form.Item name="name" label="Account name"
                   rules={[{ required: true, message: "Please fill in the account name!" }]}>
          <Input placeholder="Account Name" />
        </Form.Item>
        <Form.Item name="bankName" label="Bank name"
                   rules={[{ required: true, message: "Please fill in the bank name!" }]}>
          <Input placeholder="Bank Name" />
        </Form.Item>
        <Form.Item name="currency" label="Currency" rules={[{ required: true, message: "Please select a currency!" }]}>
          <Select
            placeholder="Currency"
            options={[
              { value: "EUR", label: `{&euro; Euro}` },
              { value: "USD", label: `$ US Dollar` },
              { value: "CHF", label: `&#8355; Swiss Franc` }
            ]}
          />
        </Form.Item>
        <Form.Item name="startingBalance" label="Starting balance"
                   rules={[{ required: true, message: "Please fill in the starting balance!" }]}>
          <InputNumber placeholder="Starting balance" />
        </Form.Item>
        <Form.Item name="startingBalanceDate" label="Starting balance date"
                   rules={[{ required: true, message: "Please pick a starting balance date!" }]}>
          <DatePicker placeholder="yyyy/mm/dd" format="YYYY/MM/DD" />
        </Form.Item>
        <Form.Item name="notes" label="Notes" initialValue={``}>
          <Input.TextArea rows={2} placeholder="Notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
