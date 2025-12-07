import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authService } from '@/services/authService'
import { Admin } from '@/types/auth'
import { sessionManager } from '@/utils/sessionManager'

interface AuthState {
  admin: Admin | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Check if we have tokens on initial load
const hasTokens = () => {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  return !!(accessToken && refreshToken)
}

const initialState: AuthState = {
  admin: null,
  isAuthenticated: false,
  isLoading: hasTokens(), // Start with loading if we have tokens
  error: null,
}

// Async thunks
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      return response.admin
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Login failed')
    }
  }
)

export const logoutAdmin = createAsyncThunk(
  'auth/logoutAdmin',
  async (_, { rejectWithValue }) => {
    try {
      // Clear tokens first for immediate effect
      authService.clearTokens()
      // Then call API (fire and forget)
      await authService.logout()
    } catch (error: any) {
      // Tokens already cleared, so logout is successful locally
      return rejectWithValue(error.response?.data?.error?.message || 'Logout failed')
    }
  }
)

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      // Only check if we have a token
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        return rejectWithValue('No access token')
      }
      
      const response = await authService.getCurrentAdmin()
      return response
    } catch (error: any) {
      // Clear tokens if auth check fails
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return rejectWithValue(error.response?.data?.error?.message || 'Auth check failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearAuth: (state) => {
      state.admin = null
      state.isAuthenticated = false
      state.error = null
      sessionManager.clearTimeout()
      // Clear tokens from localStorage
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginAdmin.fulfilled, (state, action: PayloadAction<Admin>) => {
        state.isLoading = false
        state.admin = action.payload
        state.isAuthenticated = true
        state.error = null
        sessionManager.startSession()
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
        state.admin = null
      })
      // Logout
      .addCase(logoutAdmin.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.isLoading = false
        state.admin = null
        state.isAuthenticated = false
        state.error = null
        sessionManager.clearTimeout()
      })
      .addCase(logoutAdmin.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(checkAuthStatus.fulfilled, (state, action: PayloadAction<Admin>) => {
        state.isLoading = false
        state.admin = action.payload
        state.isAuthenticated = true
        state.error = null
        sessionManager.startSession()
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false
        state.admin = null
        state.isAuthenticated = false
        state.error = null
        // Clear tokens on auth check failure
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      })
  },
})

export const { clearError, clearAuth } = authSlice.actions
export default authSlice.reducer