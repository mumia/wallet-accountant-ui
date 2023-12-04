import { Button, Form, Input, message, Modal } from "antd";
import { ApiError } from "../../config/dataService";
import TagApi from "../../api/TagApi";

type Control = {
  onClose: () => void;
  visible: boolean;
  tagCategoryId: string;
  tagCategoryName: string;
};

export default function NewTag({ onClose, visible, tagCategoryId, tagCategoryName }: Control) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const handleOk = async () => {
    messageApi.open({
      type: "loading",
      content: "Adding new tag to category..",
      duration: 0
    });

    const api = new TagApi();

    try {
      const newTag = form.getFieldsValue();
      const success = await api.newTagInCategory(tagCategoryId, newTag);

      if (success) {
        messageApi.destroy();
        messageApi.open({
          type: "success",
          content: "Tag added to category"
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
      title={`Add tag to category ${tagCategoryName}`}
      open={visible}
      footer={[
        <div className="form-footer">
          <Button size="large" type="primary" key="submit" onClick={form.submit}>
            Add tag
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
        name="addTagToCategory"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="tagName"
          label="Tag name"
          rules={[{ required: true, message: "Please fill in the tag name!" }]}
        >
          <Input placeholder="Tag name" />
        </Form.Item>
        <Form.Item name="tagNotes" label="Tag notes" initialValue={``}>
          <Input.TextArea rows={2} placeholder="Tag notes" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
