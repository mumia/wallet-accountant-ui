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
import AccountOverview, { loader as accountOverviewLoader } from "./container/movement/AccountOverview";
import NotFound from "./container/404";
import Tags, { loader as tagsLoader } from "./container/tag/Tags";
import MovementTypes, { loader as movementTypesLoader } from "./container/movementType/MovementTypes";
import Movements, { loader as movementsLoader } from "./container/movement/Movements";
import { ApiError } from "config/dataService";
import ImportedFiles, { loader as importedFilesLoader } from "./container/ImportFile/ImportedFiles";
import ImportedFileRows, { loader as importedFileRowsLoader }  from "./container/ImportFile/ImportedFileRows";

const ProviderConfig: React.FC = () => {
  useAppSelector((state: StateReducers) => {
    theme.config.mode = state.layoutMode.mode;

    return {
      isLoggedIn: state.auth.loggedIn
    };
  });

  function ErrorBoundary() {
    let error = useRouteError() as ApiError;
    console.error(typeof error);
    console.error(error);
    // Uncaught ReferenceError: path is not defined

    let errorMessage = error
    // if (typeof error.message == 'function') {
    //   errorMessage = error.message();
    // }

    return <div>Dang! {errorMessage.error}</div>;
  }

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/admin" errorElement={<ErrorBoundary />} element={<AdminLayout />}>
          <Route errorElement={<ErrorBoundary />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" loader={accountsLoader} element={<Accounts />} />
            <Route path="tags" loader={tagsLoader} element={<Tags />} />
            <Route path="movement-types" loader={movementTypesLoader} element={<MovementTypes />} />
            <Route path="movements">
              <Route index loader={accountOverviewLoader} element={<AccountOverview />} />
              <Route path=":accountId" loader={movementsLoader} element={<Movements />} />
            </Route>
            <Route path="import-files">
              <Route index loader={importedFilesLoader} element={<ImportedFiles />} />
              <Route path=":importFileId/:accountId" loader={importedFileRowsLoader} element={<ImportedFileRows />} />
            </Route>
          </Route>
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
