import { configureStore } from "@reduxjs/toolkit";
import ChangeLayoutMode, { ThemeLayoutState } from "./themeLayout/reducer";
import AuthReducer, { AuthState } from "./authentication/reducer";

export interface StateReducers {
  auth: AuthState;
  layoutMode: ThemeLayoutState
}

const store = configureStore({
  reducer: {
    auth: AuthReducer,
    layoutMode: ChangeLayoutMode
  }
});

export default store;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
