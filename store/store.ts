import { configureStore } from '@reduxjs/toolkit'
import userReducer from '../store/features/users/userSlice'
import adminReducer from '../store/features/admin/adminSlice'
import invoiceReducer from '../store/features/invoices/invoiceSlice'
import subscriptionReducer from '../store/features/subscriptions/subscriptionSlice'
import dashboardReducer from '../store/features/dashboard/dashboardSlice'

export const store = configureStore({
  reducer: {
    users:userReducer,
    admin:adminReducer,
    invoices:invoiceReducer,
    subscriptions: subscriptionReducer,
    dashboard: dashboardReducer,
  },
})

// Type helpers
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
