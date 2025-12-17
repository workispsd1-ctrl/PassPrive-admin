
import { getTokenClient } from "../../../lib/getTokenClient";
import { showToast } from '../../../hooks/useToast';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';


const isServer = typeof window === 'undefined';

const backendUrl = isServer
  ? process.env.NEXT_PUBLIC_BACKEND_URL_FOR_EC2
  : process.env.NEXT_PUBLIC_BACKEND_URL || '';


interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Invoice {
  _id: string;
  salesperson: User;
  month: string;
  submittedDate: string;
  deals: any[];
  totalCommission: number;
  totalProfit: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface InvoiceState {
  invoices: any[];
  loading: boolean;
  error: string | null;
}

const initialState: InvoiceState = {
  invoices: [],
  loading: false,
  error: null,
};

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getTokenClient();
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${backendUrl}/api/invoices/getAll`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch invoices');
      }

      const data =  await response.json();
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateInvoiceStatus = createAsyncThunk(
  'invoices/updateStatus',
  async ({ id, status }: { id: string; status: 'approved' | 'rejected' }, { rejectWithValue }) => {
    try {
      const token = await getTokenClient();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${backendUrl}/api/invoices/update/${id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update invoice');
      showToast({
      title: "Success",
      description: `Invoice is ${status} successfully`,
      type: "success"
    })
      return { id, status };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<Invoice[]>) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateInvoiceStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const index = state.invoices.findIndex(inv => inv._id === id);
        if (index !== -1) {
          state.invoices[index].status = status;
        }
      });
  },
});

export default invoiceSlice.reducer;