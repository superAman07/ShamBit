import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { fetchAdmins } from '@/store/slices/adminSlice'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AdminFormDialog } from './components/AdminFormDialog'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { AuditLogViewer } from './components/AuditLogViewer'
import { ADMIN_ROLE_LABELS } from '@/types/admin'
import { formatDate } from '@/utils/dateUtils'

export const AdminManagementPage = () => {
  const dispatch = useAppDispatch()
  const { admins, loading, error } = useAppSelector((state) => state.admin)
  const { admin: user } = useAppSelector((state) => state.auth)
  
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false)

  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchAdmins())
    }
  }, [dispatch, isSuperAdmin])

  const handleAddAdmin = () => {
    setSelectedAdminId(null)
    setFormDialogOpen(true)
  }

  const handleEditAdmin = (id: string) => {
    setSelectedAdminId(id)
    setFormDialogOpen(true)
  }

  const handleChangePassword = (id: string) => {
    setSelectedAdminId(id)
    setPasswordDialogOpen(true)
  }

  const handleViewAuditLogs = () => {
    setAuditLogDialogOpen(true)
  }

  const handleFormClose = () => {
    setFormDialogOpen(false)
    setSelectedAdminId(null)
  }

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false)
    setSelectedAdminId(null)
  }

  const handleAuditLogClose = () => {
    setAuditLogDialogOpen(false)
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have limited access to this page. Only super admins can manage admin users.
        </Alert>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1">
            Admin Users
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Contact your super admin to manage admin users or request elevated permissions.
          </Typography>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary">
                    Access restricted - Super admin privileges required
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          Admin Users
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={handleViewAuditLogs}
          >
            View Audit Logs
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAdmin}
          >
            Add Admin
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No admins found
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.username}</TableCell>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={ADMIN_ROLE_LABELS[admin.role]}
                      size="small"
                      color={admin.role === 'super_admin' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={admin.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={admin.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell>{formatDate(admin.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit Admin">
                      <IconButton
                        size="small"
                        onClick={() => handleEditAdmin(admin.id)}
                        disabled={admin.id === user?.id}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Change Password">
                      <IconButton
                        size="small"
                        onClick={() => handleChangePassword(admin.id)}
                      >
                        <LockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AdminFormDialog
        open={formDialogOpen}
        onClose={handleFormClose}
        adminId={selectedAdminId}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={handlePasswordDialogClose}
        adminId={selectedAdminId}
      />

      <AuditLogViewer
        open={auditLogDialogOpen}
        onClose={handleAuditLogClose}
      />
    </DashboardLayout>
  )
}
