import axios, { AxiosInstance, AxiosResponse } from "axios";
// import { getItem } from '../../utility/localStorageControl';

const BASE_URL = `${process.env.REACT_APP_BASE_URL}`;

// type ApiError = {
//   error: string
//   code: number
//   context?: { [key: string]: string | number }
// }

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
    // Do something with request error
    return Promise.reject(error);
  }

  private onResponseFulfilled(response: AxiosResponse): AxiosResponse {
    return response;
  }

  private onResponseRejected(error: any) {
    /**
     * Do something in case the response returns an error code [3**, 4**, 5**] etc
     * For example, on token expiration retrieve a new access token, retry a failed request etc
     */
    console.log(error);

    return Promise.reject(error);
  }
}


// function errorFromAxiosError(axiosError: AxiosError): ApiError {
//   return {error: axiosError.message, code: 999};
// }

// if (axios.isAxiosError(error)) {
//   return Promise.reject(errorFromAxiosError(error));
// }
//
// if (error.message === undefined) {
//   return Promise.reject()
// }
//
// if (.code === HttpStatusCode.Unauthorized) {
//   console.log("NEED TO LOGIN");
//
//   Navigate("/");
// }


export { DataService };
