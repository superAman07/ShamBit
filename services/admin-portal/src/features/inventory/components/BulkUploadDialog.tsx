/**
 * Bulk Upload Dialog
 * Dialog for bulk uploading inventory updates via CSV
 */

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { bulkUploadInventory, fetchInventory } from '@/store/slices/inventorySlice'
import { BulkInventoryUpdateResult } from '@/types/inventory'
import { validateCsvFile } from '@/utils/validation'

interface BulkUploadDialogProps {
  open: boolean
  onClose: () => void
}

export const BulkUploadDialog = ({ open, onClose }: BulkUploadDialogProps) => {
  const dispatch = useAppDispatch()
  const { loading, error, filters } = useAppSelector((state) => state.inventory)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<BulkInventoryUpdateResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleClose = () => {
    setSelectedFile(null)
    setUploadResult(null)
    setDragOver(false)
    onClose()
  }

  const handleFileSelect = (file: File) => {
    const validation = validateCsvFile(file)
    if (validation.valid) {
      setSelectedFile(file)
      setUploadResult(null)
    } else {
      alert(`File validation error: ${validation.error}`)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    
    const file = event.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      const result = await dispatch(bulkUploadInventory(selectedFile)).unwrap()
      setUploadResult(result)
      
      // Refresh the inventory list if there were successful updates
      if (result.success > 0) {
        dispatch(fetchInventory(filters))
      }
    } catch (error) {
      // Error is handled by the slice
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Upload Inventory</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Instructions */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Upload a CSV file to update inventory in bulk. The CSV should have the following columns:
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Required:</strong> productId, totalStock<br />
              <strong>Optional:</strong> lowStockThreshold
            </Typography>
          </Alert>

          {/* File Upload Area */}
          {!uploadResult && (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                border: dragOver ? '2px dashed' : '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'grey.300',
                bgcolor: dragOver ? 'primary.50' : 'grey.50',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                mb: 2,
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              
              <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              
              {selectedFile ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(selectedFile.size)}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 2 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                    }}
                  >
                    Remove File
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Drop your CSV file here or click to browse
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supported format: CSV files only
                  </Typography>
                </Box>
              )}
            </Paper>
          )}

          {/* Loading */}
          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Processing upload...
              </Typography>
            </Box>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Upload Results
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Alert 
                  severity="success" 
                  icon={<SuccessIcon />}
                  sx={{ flex: 1 }}
                >
                  <Typography variant="body2">
                    <strong>{uploadResult.success}</strong> records updated successfully
                  </Typography>
                </Alert>
                
                {uploadResult.failed > 0 && (
                  <Alert 
                    severity="error" 
                    icon={<ErrorIcon />}
                    sx={{ flex: 1 }}
                  >
                    <Typography variant="body2">
                      <strong>{uploadResult.failed}</strong> records failed
                    </Typography>
                  </Alert>
                )}
              </Box>

              {/* Error Details */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <List dense>
                      {uploadResult.errors.map((error, index) => (
                        <div key={index}>
                          <ListItem>
                            <ListItemText
                              primary={`Product ID: ${error.productId}`}
                              secondary={error.error}
                            />
                          </ListItem>
                          {index < uploadResult.errors.length - 1 && <Divider />}
                        </div>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}

              {/* Upload Another File */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedFile(null)
                    setUploadResult(null)
                  }}
                >
                  Upload Another File
                </Button>
              </Box>
            </Box>
          )}

          {/* CSV Template Download */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              CSV Template Example:
            </Typography>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
{`productId,totalStock,lowStockThreshold
prod-123,100,10
prod-456,50,5
prod-789,200,20`}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {uploadResult ? 'Close' : 'Cancel'}
        </Button>
        {!uploadResult && (
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}