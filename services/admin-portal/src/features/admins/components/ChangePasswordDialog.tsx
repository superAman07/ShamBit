import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { changeAdminPassword, clearError } from '@/store/slices/adminSlice'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
  adminId: string | null
}

export const ChangePasswordDialog = ({ open, onClose, adminId }: ChangePasswordDialogProps) => {
  const dispatch = useAppDispatch()
  const { admins, loading, error } = useAppSelector((state) => state.admin)
  
  const admin = adminId ? admins.find(a => a.id === adminId) : null

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setNewPassword('')
      setConfirmPassword('')
      setFormErrors({})
      setSuccess(false)
      dispatch(clearError())
    }
  }, [open, dispatch])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!newPassword) {
      errors.newPassword = 'Password is required'
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter'
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one number'
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      errors.newPassword = 'Password must contain at least one special character'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm password'
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!adminId || !validateForm()) {
      return
    }

    try {
      await dispatch(changeAdminPassword({
        id: adminId,
        newPassword,
      })).unwrap()
      
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      // Error is handled by Redux
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change Password for {admin?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {success && (
            <Alert severity="success">Password changed successfully!</Alert>
          )}

          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              if (formErrors.newPassword) {
                setFormErrors(prev => ({ ...prev, newPassword: '' }))
              }
            }}
            error={!!formErrors.newPassword}
            helperText={formErrors.newPassword || 'Min 8 characters, 1 uppercase, 1 number, 1 special char'}
            fullWidth
            required
            disabled={success}
          />

          <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (formErrors.confirmPassword) {
                setFormErrors(prev => ({ ...prev, confirmPassword: '' }))
              }
            }}
            error={!!formErrors.confirmPassword}
            helperText={formErrors.confirmPassword}
            fullWidth
            required
            disabled={success}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success}
        >
          Change Password
        </Button>
      </DialogActions>
    </Dialog>
  )
}
