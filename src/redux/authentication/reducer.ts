// import Cookies from 'js-cookie';
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  loggedIn: boolean
  loading: boolean
  error: any
}

interface Callback {
  callback: () => void
}

const initialState: AuthState = {
  // loggedIn: Cookies.get('loggedIn') === 'true',
  loggedIn: true,
  loading: false,
  error: null,
};

const authSlice = createSlice(
  {
    name: 'auth',
    initialState,
    reducers: {
      login: (state, action: PayloadAction<Callback>) => {
        state.loading = true;

        // try {
          // const response = await DataService.post('/login', values);
          // if (response.data.errors) {
          //   dispatch(loginErr(response.data.errors));
          // } else {
          //   Cookies.set('access_token', response.data.data.token);
          //   Cookies.set('loggedIn', 'true');
        //     dispatch(loginSuccess(true));
        state.loggedIn = true;
        state.loading = false;
        //     callback();
        //   }
        // } catch (err) {
        //   dispatch(loginErr(err));
        // }

        action.payload.callback()
      },

      logout: (state, action: PayloadAction<Callback>) => {
        state.loading = true;

        // Cookies.remove('loggedIn');
        // Cookies.remove('access_token');

        state.loading = false;
        state.loggedIn = false;
        state.error = null;

        action.payload.callback()
      },
    }
  }
);

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;
