import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, Box, CircularProgress } from '@mui/material'
import { store } from '@/store'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary, RouteErrorBoundary } from '@/components/ErrorBoundary'
import { LoginPage } from '@/features/auth/LoginPage'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { checkAuthStatus } from '@/store/slices/authSlice'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductListPage } from '@/features/products/ProductListPage'
import { ProductFormPage } from '@/features/products/ProductFormPage'
import { CategoryManagement } from '@/features/products/CategoryManagement'
import { InventoryListPage } from '@/features/inventory/InventoryListPage'
import { OrderListPage } from '@/features/orders/OrderListPage'
import { DeliveryManagementPage } from '@/features/delivery/DeliveryManagementPage'
import { PromotionsPage } from '@/features/promotions/PromotionsPage'
import ProductOffersPage from '@/features/product-offers/ProductOffersPage'
import { AdminManagementPage } from '@/features/admins/AdminManagementPage'
import InventoryAdjustmentPage from '@/features/inventory/InventoryAdjustmentPage'
import { BrandListPage } from '@/features/brands/BrandListPage'
import { BrandFormPage } from '@/features/brands/BrandFormPage'
import SettingsPage from '@/features/settings/SettingsPage'
import { CustomerListPage } from '@/features/customers/CustomerListPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import SellersListPage from '@/features/sellers/SellersListPage'
import EnhancedDashboard from '@/features/dashboard/EnhancedDashboard'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Auth initialization component
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const { isLoading, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // Check auth status on app mount if we have tokens
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      dispatch(checkAuthStatus())
    }
  }, [dispatch])

  // Show loading screen during initial auth check
  if (isLoading && !isAuthenticated) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)' }}
      >
        <Box textAlign="center">
          <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
          <Box sx={{ color: 'white', fontSize: '1.1rem', fontWeight: 500 }}>
            Loading...
          </Box>
        </Box>
      </Box>
    )
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary 
      level="page" 
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={(error: Error, errorInfo: React.ErrorInfo) => {
        // Log to error reporting service in production
        console.error('App-level error:', error, errorInfo);
      }}
    >
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <AuthInitializer>
              <RouteErrorBoundary>
                <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enhanced-dashboard"
              element={
                <ProtectedRoute>
                  <EnhancedDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomerListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sellers"
              element={
                <ProtectedRoute>
                  <SellersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute>
                  <ProductFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <ProtectedRoute>
                  <ProductFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/categories"
              element={
                <ProtectedRoute>
                  <CategoryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands"
              element={
                <ProtectedRoute>
                  <BrandListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands/new"
              element={
                <ProtectedRoute>
                  <BrandFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands/:id/edit"
              element={
                <ProtectedRoute>
                  <BrandFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/delivery"
              element={
                <ProtectedRoute>
                  <DeliveryManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/promotions"
              element={
                <ProtectedRoute>
                  <PromotionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product-offers"
              element={
                <ProtectedRoute>
                  <ProductOffersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admins"
              element={
                <ProtectedRoute>
                  <AdminManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/adjust"
              element={
                <ProtectedRoute>
                  <InventoryAdjustmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />


            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </RouteErrorBoundary>
            </AuthInitializer>
          </Router>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  )
}

export default App