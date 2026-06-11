import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, authLoading: true },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.authLoading = false;
    },
  },
});

export const { setUser } = authSlice.actions;
export default authSlice;
