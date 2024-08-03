import { Button, Form, message, Modal, Select, Upload, GetProp, UploadProps } from "antd";
import { ApiError } from "../../config/dataService";
import ImportFileApi, { RegisterImportFile } from "../../api/ImportFileApi";
import accounts from "@root/container/account/Accounts";
import { UilFile } from "@iconscout/react-unicons";

type Control = {
  onClose: () => void;
  visible: boolean;
  accountNames: Map<string, string>
};

export default function RegisterNewImportFile({ onClose, visible, accountNames }: Control) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const handleOk = async () => {
    messageApi.open({
      type: "loading",
      content: "Registering import file..",
      duration: 0
    });

    const api = new ImportFileApi();

    try {
      const importFile = form.getFieldsValue();

      console.log(importFile);

      const success = await api.registerImportFile(importFile);

      if (success) {
        messageApi.destroy();
        messageApi.open({
          type: "success",
          content: "Import file registered"
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

  const handleClose = () => {onClose();};

  type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

  const isCsv = (file: FileType) => {
    return file.type === "text/csv"
  }

  const hasCorrectSize = (file: FileType) => {
    return file.size / (8 * 1024) < 8;
  }
  // const beforeUpload = (file: FileType) => {
  //   const isCsv = file.type === "text/csv";
  //   if (!isCsv) {
  //     messageApi.open({
  //       type: "error",
  //       content: "You can only upload CSV file!"
  //     });
  //   }
  //   const isLt8M = file.size / (8 * 1024) < 8;
  //   if (!isLt8M) {
  //     messageApi.open({
  //       type: "error",
  //       content: "File must be smaller than 8 MB!"
  //     });
  //   }
  //   return isCsv && isLt8M;
  // };

  const dummyRequest = ({ onSuccess }: any) => {
    setTimeout(() => {
      onSuccess("ok");
    }, 0);
  };

  let accounts: { value: string, label: string }[] = [];
  accountNames.forEach(
    (name, key) => accounts.push({ value: key, label: name })
  );

  return (
    <Modal
      title="Register import file"
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
        name="registerImportFile"
        onFinish={handleOk}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item<RegisterImportFile>
          name="accountId"
          label="Account"
          rules={[{ required: true, message: "Please select an account!" }]}
        >
          <Select
            placeholder="Account"
            options={accounts}
          />
        </Form.Item>
        <Form.Item<RegisterImportFile>
          name="filename"
          label="File"
          rules={[
            { required: true, message: "Please select a file!" },
            {
              validator: (_, value: FileType) => {
                if (!isCsv(value)) {
                  return Promise.reject(new Error('You can only upload CSV files!'));
                }

                if (!hasCorrectSize(value)) {
                  return Promise.reject(new Error('File must be smaller than 8 MB!'));
                }

                return Promise.resolve();
              }
            },
          ]}
          getValueFromEvent={({file}) => file.originFileObj}
        >
          <Upload
            name="file"
            customRequest={dummyRequest}
            multiple={false}
            maxCount={1}
          >
            <Button><UilFile />Click to upload</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}
