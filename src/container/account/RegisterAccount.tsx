import { Button, DatePicker, Form, Input, Modal, Select } from "antd";

const { Option } = Select;

type Control = {
  onClose: () => void;
  visible: boolean;
};

export default function RegisterAccount({ onClose, visible }: Control) {
  const [form] = Form.useForm();

  const handleOk = () => {
    console.log(form.getFieldsValue());
    console.log(JSON.stringify(form.getFieldsValue()));



    // onCancel();
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
      <Form
        form={form}
        name="registerAccount"
        onFinish={handleOk}
        layout="vertical"
      >
        <Form.Item name="acocuntType" label="Account type" rules={[{ required: true, message: 'Please select an account type!' }]}>
          <Select placeholder="Account type">
            <Option value="1">Checking</Option>
            <Option value="2">Savings</Option>
          </Select>
        </Form.Item>
        <Form.Item name="name" label="Account name" rules={[{ required: true, message: 'Please fill in the account name!' }]}>
          <Input placeholder="Account Name" />
        </Form.Item>
        <Form.Item name="bankName" label="Bank name" rules={[{ required: true, message: 'Please fill in the bank name!' }]}>
          <Input placeholder="Bank Name" />
        </Form.Item>
        <Form.Item name="currency" label="Currency" rules={[{ required: true, message: 'Please select a currency!' }]}>
          <Select placeholder="Currency">
            <Option value="EUR">&euro; Euro</Option>
            <Option value="USD">$ US Dollar</Option>
            <Option value="CHF">&#8355; Swiss Franc</Option>
          </Select>
        </Form.Item>
        <Form.Item name="startingBalance" label="Starting balance" rules={[{ required: true, message: 'Please fill in the starting balance!' }]}>
          <Input placeholder="Starting balance" />
        </Form.Item>
        <Form.Item name="startingBalanceDate" label="Starting balance date" rules={[{ required: true, message: 'Please pick a starting balance date!' }]}>
          <DatePicker placeholder="yyyy/mm/dd" format="YYYY/MM/DD" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
