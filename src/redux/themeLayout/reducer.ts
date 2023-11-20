import staticData from '../../config/config';
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ThemeLayoutState {
  mode: string
  loading: boolean
  rtlLoading: boolean
  menuLoading: boolean
  mainContentLoading: boolean
  error: any
}

const initialState:ThemeLayoutState = {
  mode: staticData.mainTemplate,
  loading: false,
  rtlLoading: false,
  menuLoading: false,
  mainContentLoading: false,
  error: null,
};

const themeLayoutSlice = createSlice(
  {
    name: 'themeLayout',
    initialState,
    reducers: {
      changeLayoutModeBegin: (state: ThemeLayoutState) => {
        state.loading = true
      },
      changeLayoutModeSuccess: (state: ThemeLayoutState, action: PayloadAction<string>) => {
        state.loading = false
        state.mode = action.payload
      },
      changeLayoutModeErr: (state: ThemeLayoutState, action: PayloadAction<any>) => {
        state.loading = false
        state.error = action.payload
      },
    },
  }
);

export const {
  changeLayoutModeBegin,
  changeLayoutModeSuccess,
  changeLayoutModeErr,
} = themeLayoutSlice.actions;

export default themeLayoutSlice.reducer;
