import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import dashboardReducer from './slices/dashboardSlice'
import productReducer from './slices/productSlice'
import inventoryReducer from './slices/inventorySlice'
import orderReducer from './slices/orderSlice'
import deliveryReducer from './slices/deliverySlice'
import promotionReducer from './slices/promotionSlice'
import adminReducer from './slices/adminSlice'
import customerReducer from './slices/customerSlice'
import reportsReducer from './slices/reportsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    product: productReducer,
    inventory: inventoryReducer,
    orders: orderReducer,
    delivery: deliveryReducer,
    promotion: promotionReducer,
    admin: adminReducer,
    customers: customerReducer,
    reports: reportsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch