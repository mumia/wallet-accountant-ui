import { Options } from "react-use-websocket";

type Message = {
  subject: string;
  event: string;
}

export const WS_URL = `${process.env.REACT_APP_WS_URL}`;

export const WebSocketRunnerHelper = (
  updateOn: string,
  onUpdate: () => void,
  debug?: boolean
): Options => {
  return {
    filter: (message: MessageEvent<Message>): boolean => {
      if (debug) {
        console.log("WebSocketWrapper filtering message", message, updateOn);
      }

      return message.data.subject === updateOn;
    },
    onOpen: () => {
      if (debug) {
        console.log("WebSocketWrapper connection established - " + updateOn);
      }
    },
    onMessage: () => {
      if (debug) {
        console.log("WebSocketWrapper got message",  updateOn);
      }

      onUpdate()
    },
    onClose: (event) => {
      if (debug) {
        console.log("WebSocketWrapper connection closed - " + updateOn + ' - ' + event.reason);
      }
    },
    // heartbeat: true,
    // retryOnError: true,
    // shouldReconnect: event => true
  };
};
