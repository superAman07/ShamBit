import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Box,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { createAdmin, updateAdmin, fetchAdmins, clearError } from '@/store/slices/adminSlice'
import { AdminRole, ADMIN_ROLE_LABELS } from '@/types/admin'

interface AdminFormDialogProps {
  open: boolean
  onClose: () => void
  adminId: string | null
}

export const AdminFormDialog = ({ open, onClose, adminId }: AdminFormDialogProps) => {
  const dispatch = useAppDispatch()
  const { admins, loading, error } = useAppSelector((state) => state.admin)
  
  const isEdit = !!adminId
  const admin = isEdit ? admins.find(a => a.id === adminId) : null

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'order_manager' as AdminRole,
    isActive: true,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (admin) {
      setFormData({
        username: admin.username,
        password: '',
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
      })
    } else {
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        role: 'order_manager',
        isActive: true,
      })
    }
    setFormErrors({})
    dispatch(clearError())
  }, [admin, open, dispatch])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    }

    if (!isEdit && !formData.password) {
      errors.password = 'Password is required'
    }

    if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      if (isEdit) {
        await dispatch(updateAdmin({
          id: adminId,
          data: {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            isActive: formData.isActive,
          },
        })).unwrap()
      } else {
        await dispatch(createAdmin({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          email: formData.email,
          role: formData.role,
        })).unwrap()
      }
      
      dispatch(fetchAdmins())
      onClose()
    } catch (err) {
      // Error is handled by Redux
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Admin' : 'Add New Admin'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          <TextField
            label="Username"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            error={!!formErrors.username}
            helperText={formErrors.username}
            disabled={isEdit}
            fullWidth
            required
          />

          {!isEdit && (
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={!!formErrors.password}
              helperText={formErrors.password || 'Min 8 characters, 1 uppercase, 1 number, 1 special char'}
              fullWidth
              required
            />
          )}

          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!formErrors.name}
            helperText={formErrors.name}
            fullWidth
            required
          />

          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!formErrors.email}
            helperText={formErrors.email}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              label="Role"
            >
              {Object.entries(ADMIN_ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isEdit && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                />
              }
              label="Active"
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
