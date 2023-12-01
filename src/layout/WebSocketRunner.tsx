import { Options } from "react-use-websocket";

type Message = {
  subject: string;
  event: string;
}

export const WS_URL = `${process.env.REACT_APP_WS_URL}`;

export const WebSocketRunnerHelper = (
  updateOn: string,
  onUpdate: () => void
): Options => {
  return {
    filter: (message: MessageEvent<Message>): boolean => {
      return message.data.subject === updateOn;
    },
    // onOpen: () => {
    //   console.log("WebSocketWrapper connection established - " + updateOn);
    // },
    onMessage: () => onUpdate,
    // onClose: (event) => {
    //   console.log("WebSocketWrapper connection closed - " + updateOn + ' - ' + event.reason);
    // }
  };
};
