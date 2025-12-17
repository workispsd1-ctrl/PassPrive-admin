import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getTokenClient } from "../../../lib/getTokenClient";


const isServer = typeof window === 'undefined';

const backendUrl = isServer
  ? process.env.NEXT_PUBLIC_BACKEND_URL_FOR_EC2
  : process.env.NEXT_PUBLIC_BACKEND_URL || '';


interface SubscriptionState {
  currentMonthSubscriptions: any[];
  subscriptionStats: any;
  userSubscriptions: Record<string, any[]>;
  loading: boolean;
  error: string | null;
  lastFetched: {
    currentMonth: number | null;
    stats: number | null;
    userSubs: number | null;
  };
}

const initialState: SubscriptionState = {
  currentMonthSubscriptions: [],
  subscriptionStats: {},
  userSubscriptions: {},
  loading: false,
  error: null,
  lastFetched: {
    currentMonth: null,
    stats: null,
    userSubs: null
  }
};

// Helper function to handle API errors
const handleApiError = (error: any) => {
  if (error.response) {
    throw new Error(error.response.data.message || 'Server responded with an error');
  } else if (error.request) {
    throw new Error('No response received from server');
  } else {
    throw new Error(error.message || 'Request failed');
  }
};

// Thunks for async operations
export const fetchCurrentMonthSubscriptions = createAsyncThunk(
  'subscriptions/fetchCurrentMonth',
  async (_, { getState }) => {
    const state = getState() as { subscriptions: SubscriptionState };
    const lastFetched = state.subscriptions.lastFetched.currentMonth;
    
    if (lastFetched && Date.now() - lastFetched < 300000) {
      return state.subscriptions.currentMonthSubscriptions;
    }
    
    try {
        const token = await getTokenClient();
      if (!token) {
        console.log('Authentication required');
        return;
      }
      const response = await axios.get(`${backendUrl}/api/subscriptions/current-month`,
        {
            headers: { 
          'Authorization': `Bearer ${token}`
        },
        }
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const fetchSubscriptionStats = createAsyncThunk(
  'subscriptions/fetchStats',
  async (_, { getState }) => {
    const state = getState() as { subscriptions: SubscriptionState };
    const lastFetched = state.subscriptions.lastFetched.stats;
    
    if (lastFetched && Date.now() - lastFetched < 300000) {
      return state.subscriptions.subscriptionStats;
    }
    
    try {
        const token = await getTokenClient();
      if (!token) {
        console.log('Authentication required');
        return;
      }
      const response = await axios.get(`${backendUrl}/api/subscriptions/stats`, {
        headers:{
           'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const fetchUserSubscriptions = createAsyncThunk(
  'subscriptions/fetchUserSubscriptions',
  async (userId: string, { getState }) => {
    const state = getState() as { subscriptions: SubscriptionState };
    
    if (state.subscriptions.userSubscriptions[userId]) {
      return { userId, data: state.subscriptions.userSubscriptions[userId] };
    }
    
    try {
        const token = await getTokenClient();
      if (!token) {
        console.log('Authentication required');
        return;
      }
      const response = await axios.get(`${backendUrl}/api/subscriptions/user/${userId}`,{
        headers: {
             'Authorization': `Bearer ${token}`
        }
      });
      return { userId, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {
    resetSubscriptions: (state) => {
      state.currentMonthSubscriptions = [];
      state.subscriptionStats = {};
      state.userSubscriptions = {};
      state.error = null;
      state.loading = false;
      state.lastFetched = {
        currentMonth: null,
        stats: null,
        userSubs: null
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentMonthSubscriptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentMonthSubscriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMonthSubscriptions = action.payload.data || [];
        state.lastFetched.currentMonth = Date.now();
      })
      .addCase(fetchCurrentMonthSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch subscriptions';
      })
      .addCase(fetchSubscriptionStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptionStats.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptionStats = action.payload.data || {};
        state.lastFetched.stats = Date.now();
      })
      .addCase(fetchSubscriptionStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch stats';
      })
      .addCase(fetchUserSubscriptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSubscriptions.fulfilled, (state, action) => {
        state.loading = false;
        state.userSubscriptions[action.payload.userId] = action.payload.data || [];
        state.lastFetched.userSubs = Date.now();
      })
      .addCase(fetchUserSubscriptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user subscriptions';
      });
  }
});

export const { resetSubscriptions } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;