import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { adminService } from '@/services/adminService'
import { AdminUser, CreateAdminRequest, UpdateAdminRequest, AdminAuditLog } from '@/types/admin'

interface AdminState {
  admins: AdminUser[]
  currentAdmin: AdminUser | null
  auditLogs: AdminAuditLog[]
  auditLogsPagination: {
    page: number
    pageSize: number
    totalPages: number
    total: number
  }
  loading: boolean
  error: string | null
}

const initialState: AdminState = {
  admins: [],
  currentAdmin: null,
  auditLogs: [],
  auditLogsPagination: {
    page: 1,
    pageSize: 100,
    totalPages: 0,
    total: 0,
  },
  loading: false,
  error: null,
}

// Async thunks
export const fetchAdmins = createAsyncThunk(
  'admin/fetchAdmins',
  async () => {
    return await adminService.getAllAdmins()
  }
)

export const fetchAdminById = createAsyncThunk(
  'admin/fetchAdminById',
  async (id: string) => {
    return await adminService.getAdminById(id)
  }
)

export const createAdmin = createAsyncThunk(
  'admin/createAdmin',
  async (data: CreateAdminRequest) => {
    return await adminService.createAdmin(data)
  }
)

export const updateAdmin = createAsyncThunk(
  'admin/updateAdmin',
  async ({ id, data }: { id: string; data: UpdateAdminRequest }) => {
    return await adminService.updateAdmin(id, data)
  }
)

export const changeAdminPassword = createAsyncThunk(
  'admin/changePassword',
  async ({ id, newPassword }: { id: string; newPassword: string }) => {
    await adminService.changePassword(id, { newPassword })
    return id
  }
)

export const fetchAuditLogs = createAsyncThunk(
  'admin/fetchAuditLogs',
  async (params?: {
    limit?: number
    offset?: number
    adminId?: string
    action?: string
    resourceType?: string
    resourceId?: string
    startDate?: string
    endDate?: string
  }) => {
    return await adminService.getAuditLogs(params)
  }
)

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearCurrentAdmin: (state) => {
      state.currentAdmin = null
    },
  },
  extraReducers: (builder) => {
    // Fetch admins
    builder.addCase(fetchAdmins.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchAdmins.fulfilled, (state, action: PayloadAction<AdminUser[]>) => {
      state.loading = false
      state.admins = action.payload
    })
    builder.addCase(fetchAdmins.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch admins'
    })

    // Fetch admin by ID
    builder.addCase(fetchAdminById.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchAdminById.fulfilled, (state, action: PayloadAction<AdminUser>) => {
      state.loading = false
      state.currentAdmin = action.payload
    })
    builder.addCase(fetchAdminById.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch admin'
    })

    // Create admin
    builder.addCase(createAdmin.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createAdmin.fulfilled, (state, action: PayloadAction<AdminUser>) => {
      state.loading = false
      state.admins.push(action.payload)
    })
    builder.addCase(createAdmin.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to create admin'
    })

    // Update admin
    builder.addCase(updateAdmin.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(updateAdmin.fulfilled, (state, action: PayloadAction<AdminUser>) => {
      state.loading = false
      const index = state.admins.findIndex(a => a.id === action.payload.id)
      if (index !== -1) {
        state.admins[index] = action.payload
      }
      if (state.currentAdmin?.id === action.payload.id) {
        state.currentAdmin = action.payload
      }
    })
    builder.addCase(updateAdmin.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to update admin'
    })

    // Change password
    builder.addCase(changeAdminPassword.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(changeAdminPassword.fulfilled, (state) => {
      state.loading = false
    })
    builder.addCase(changeAdminPassword.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to change password'
    })

    // Fetch audit logs
    builder.addCase(fetchAuditLogs.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchAuditLogs.fulfilled, (state, action) => {
      state.loading = false
      state.auditLogs = action.payload.logs
      state.auditLogsPagination = {
        page: action.payload.page,
        pageSize: action.payload.pageSize,
        totalPages: action.payload.totalPages,
        total: action.payload.total,
      }
    })
    builder.addCase(fetchAuditLogs.rejected, (state, action) => {
      state.loading = false
      state.error = action.error.message || 'Failed to fetch audit logs'
    })
  },
})

export const { clearError, clearCurrentAdmin } = adminSlice.actions
export default adminSlice.reducer
