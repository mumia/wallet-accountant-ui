import React from "react";
import "./App.css";
import store, { StateReducers } from "./redux/store";
import { Provider } from "react-redux";
import { useAppSelector } from "./redux/hooks";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
  useRouteError
} from "react-router-dom";
import Dashboard from "./container/dashboard/Dashboard";
import AdminLayout from "./layout/AdminLayout";
import { ConfigProvider } from "antd";
import { ThemeProvider } from "styled-components";
import { theme } from "./config/theme/themeVariables";
import Accounts, { loader as accountsLoader } from "./container/account/Accounts";
import Movements from "./container/movements/Movements";
import NotFound from "./container/404";

export type Message = {
  subject: string
  event: string
}

const ProviderConfig: React.FC = () => {
  useAppSelector((state: StateReducers) => {
    theme.config.mode = state.layoutMode.mode;

    return {
      isLoggedIn: state.auth.loggedIn
    };
  });

  function ErrorBoundary() {
    let error = useRouteError();
    console.error(error);
    // Uncaught ReferenceError: path is not defined

    return <div>Dang!</div>;
  }

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" loader={accountsLoader} errorElement={<ErrorBoundary />} element={<Accounts />} />
          <Route path="movements" element={<Movements />} />
        </Route>
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<Navigate replace to="/not-found" />} />
      </>
    )
  );

  const antThemeTokens = {
    // Colors
    colorPrimary: theme.colors.primaryColor,

    // Font
    fontFamily: theme.fontFamily
  };

  return (
    <ConfigProvider direction="ltr" theme={{ token: antThemeTokens }}>
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ProviderConfig />
    </Provider>
  );
};

export default App;
