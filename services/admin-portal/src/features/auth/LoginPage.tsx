import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Divider,
  useTheme,
  alpha,
} from '@mui/material'
import {
  AdminPanelSettings,
  Security,
  Login as LoginIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { loginAdmin, clearError } from '@/store/slices/authSlice'
import { sanitizeText } from '@/utils/validation'


export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({})

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      // Small delay to prevent flash
      const timer = setTimeout(() => {
        navigate(from, { replace: true })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, navigate, location])

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError())
    }
  }, [dispatch])

  const validateForm = () => {
    const errors: { username?: string; password?: string } = {}
    
    if (!username.trim()) {
      errors.username = 'Username is required'
    }
    
    if (!password.trim()) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    dispatch(clearError())
    // Sanitize inputs before sending
    dispatch(loginAdmin({ 
      username: sanitizeText(username), 
      password: password // Don't sanitize password as it may contain special chars
    }))
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        maxHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 1, sm: 2 },
        overflow: 'hidden',
      }}
    >
      <Container component="main" maxWidth="sm" sx={{ height: 'fit-content' }}>
        <Paper
          elevation={24}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            maxHeight: '95vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Section with Logo */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              py: { xs: 3, sm: 4 },
              px: 3,
              textAlign: 'center',
              position: 'relative',
              flex: '0 0 auto',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                opacity: 0.3,
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Large Logo */}
              <Box
                sx={{
                  width: { xs: 90, sm: 100 },
                  height: { xs: 90, sm: 100 },
                  mx: 'auto',
                  mb: 2,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Box
                  component="img"
                  src="/logo.png"
                  alt="ShamBit Logo"
                  sx={{
                    width: { xs: 60, sm: 70 },
                    height: { xs: 60, sm: 70 },
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    // Fallback to icon if logo image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const icon = document.createElement('div');
                      icon.innerHTML = '<svg width="70" height="70" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 8.6 14.8 10.1V11.1C14.8 12.6 13.4 14.1 12 14.1S9.2 12.6 9.2 11.1V10.1C9.2 8.6 10.6 7 12 7M18.5 22L16.5 20H7.5L5.5 22H18.5Z"/></svg>';
                      icon.style.color = 'white';
                      parent.appendChild(icon);
                    }
                  }}
                />
              </Box>

              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 700,
                  mb: 0.5,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.8rem', sm: '2.125rem' },
                }}
              >
                ShamBit Admin
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Security sx={{ fontSize: 18, opacity: 0.9 }} />
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 400,
                    opacity: 0.95,
                    letterSpacing: '0.02em',
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                  }}
                >
                  Administrative Portal
                </Typography>
              </Box>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  opacity: 0.85,
                  maxWidth: 280,
                  mx: 'auto',
                  lineHeight: 1.4,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                }}
              >
                Secure access to manage your platform
              </Typography>
              
            </Box>
          </Box>

          {/* Login Form Section */}
          <CardContent sx={{ p: { xs: 3, sm: 4 }, flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2 }}>
              <Typography 
                variant="h6" 
                component="h2" 
                align="center" 
                gutterBottom
                sx={{ 
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                }}
              >
                Welcome Back
              </Typography>
              <Typography 
                variant="body2" 
                align="center" 
                color="text.secondary"
                sx={{ mb: 2, fontSize: '0.85rem' }}
              >
                Please sign in to continue
              </Typography>
              
              <Divider sx={{ mb: 2 }}>
                <AdminPanelSettings color="action" sx={{ fontSize: 20 }} />
              </Divider>
            </Box>



            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  py: 0.5,
                  '& .MuiAlert-icon': {
                    fontSize: '1.1rem',
                  },
                  '& .MuiAlert-message': {
                    fontSize: '0.85rem',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1 }}>
              <TextField
                margin="dense"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={!!formErrors.username}
                helperText={formErrors.username}
                disabled={isLoading}
                size="small"
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
              
              <TextField
                margin="dense"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={isLoading}
                size="small"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
                sx={{
                  mt: 1,
                  mb: 2,
                  py: 1.2,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: theme.palette.action.disabledBackground,
                    boxShadow: 'none',
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
              </Button>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 'auto', textAlign: 'center' }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block',
                  opacity: 0.7,
                  fontSize: '0.7rem',
                }}
              >
                © 2025 ShamBit. All rights reserved.
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block',
                  mt: 0.25,
                  opacity: 0.6,
                  fontSize: '0.65rem',
                }}
              >
                Secure • Reliable • Professional
              </Typography>
            </Box>
          </CardContent>
        </Paper>
      </Container>
    </Box>
  )
}