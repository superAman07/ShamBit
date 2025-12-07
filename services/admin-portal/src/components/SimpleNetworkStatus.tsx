import React, { useState, useEffect } from 'react'
import { Alert, Box, Typography, Chip } from '@mui/material'
import { CheckCircle, Info } from '@mui/icons-material'
import { getApiBaseUrl } from '@/config/api'

export const SimpleNetworkStatus: React.FC = () => {
  const [apiUrl, setApiUrl] = useState('')

  useEffect(() => {
    const url = getApiBaseUrl()
    setApiUrl(url)
  }, [])

  return (
    <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          API Server Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connecting to: <strong>{apiUrl}</strong>
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Chip 
            size="small" 
            label="Auto-detected" 
            color="primary"
            variant="outlined"
            icon={<CheckCircle />}
          />
        </Box>
      </Box>
    </Alert>
  )
}