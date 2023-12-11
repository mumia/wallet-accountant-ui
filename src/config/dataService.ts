import axios, { AxiosError, AxiosInstance, AxiosResponse, HttpStatusCode } from "axios";
import { Navigate } from "react-router-dom";
import { MessageInstance } from "antd/es/message/interface";

const BASE_URL = `${process.env.REACT_APP_BASE_URL}`;

type Context = { [key: string]: string | number | undefined }

export class ApiError {
  readonly _error: string;
  readonly _code: number;
  readonly _context?: Context;

  constructor(error: string, code: number, context?: Context) {
    this._error = error;
    this._code = code;
    this._context = context;
  }

  get error() {
    return this._error;
  }

  get code() {
    return this._code;
  }

  get context() {
    return this._context;
  }

  message() {
    return this._error + " (" + this._code + ")";
  }
}

export const writeOperationHelper = async (
  messageApi: MessageInstance,
  loadingMessage: string,
  successMessage: string,
  writeOperation: () => Promise<boolean>,
  onSuccess: () => void
) => {
  messageApi.open({
    type: "loading",
    content: loadingMessage,
    duration: 0
  });

  try {
    const success = await writeOperation();

    if (success) {
      messageApi.destroy();
      messageApi.open({
        type: "success",
        content: successMessage
      });

      onSuccess();
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
}

class DataService {
  protected client: AxiosInstance;

  constructor() {
    this.client = axios.create(
      {
        baseURL: BASE_URL,
        headers: { "Content-Type": "application/json" }
      }
    );

    /**
     * axios interceptors runs before and after a request, letting the developer modify req,req more
     * For more details on axios interceptor see https://github.com/axios/axios#interceptors
     */
    this.client.interceptors.request.use(this.onRequestFulfilled, this.onRequestRejected);
    this.client.interceptors.response.use(this.onResponseFulfilled, this.onResponseRejected);
  }

  private onRequestFulfilled<T>(config: T): T {
    // do something before executing the request
    // For example tag along the bearer access token to request header or set a cookie
    //const requestConfig = config;
    //const { headers } = config;
    //config.headers.setAuthorization(`Bearer ${getItem('access_token')}`)

    return config;
  }

  private onRequestRejected(error: any) {
    return processError(error);
  }

  private onResponseFulfilled(response: AxiosResponse): AxiosResponse {
    return response;
  }

  private onResponseRejected(error: any): Promise<ApiError> {
    return processError(error);
  }
}

function processError(error: any): Promise<ApiError> {
  /**
   * Do something in case the response returns an error code [3**, 4**, 5**] etc
   * For example, on token expiration retrieve a new access token, retry a failed request etc
   */
  if (axios.isAxiosError(error)) {
    const axiosError: AxiosError = error;
    switch (axiosError.response === undefined ? 0 : axiosError.response.status) {
      case HttpStatusCode.Unauthorized:
        console.log("NEED TO LOGIN");

        Navigate({ to: "/" });

        break;

      case HttpStatusCode.BadRequest:
      case HttpStatusCode.InternalServerError:
        return Promise.reject(apiErrorFromWalletAccountantError(error));

      default:
        return Promise.reject(apiErrorFromAxiosError(error));
    }
  }

  return Promise.reject(apiErrorFromError(error));
}

function apiErrorFromWalletAccountantError(error: AxiosError): ApiError {
  if (error.response === undefined) {
    return apiErrorFromAxiosError(error);
  }

  const errorData = error.response.data as { error: string, code: number, context?: Context };

  console.log(errorData);

  const apiError = new ApiError(errorData.error, errorData.code, errorData.context);

  console.log("WA Error: (" + error.message + ") - " + JSON.stringify(apiError));

  return apiError;
}

function apiErrorFromAxiosError(error: AxiosError): ApiError {
  const apiError = new ApiError(error.message, 999);

  console.log("Error: (" + error.message + ") - " + JSON.stringify(apiError));

  return apiError;
}

function apiErrorFromError(error: Error): ApiError {
  const apiError = new ApiError(error.message, 999, { stack: error.stack });
  console.log("Error: " + JSON.stringify(apiError));

  return apiError;
}

export { DataService };
