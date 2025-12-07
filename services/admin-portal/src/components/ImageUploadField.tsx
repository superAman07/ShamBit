import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { uploadService } from '../services/uploadService';

interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string, mobileUrl?: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  helperText?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  onError,
  disabled = false,
  helperText,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [variants, setVariants] = useState<Record<string, ImageVariant> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      
      // Check if online
      if (!navigator.onLine) {
        const errorMsg = 'No internet connection. Please check your network and try again.';
        setUploadError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (!file.type.startsWith('image/')) {
        const errorMsg = 'Please select an image file';
        setUploadError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        const errorMsg = 'Image size must be less than 10MB';
        setUploadError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setUploading(true);
      try {
        const result = await uploadService.uploadBanner(file, (progress) => {
          // Progress tracking handled internally
          console.log(`Upload progress: ${progress.percentage}%`);
        });
        setVariants(result.variants);
        
        // Ensure URLs are absolute with API base URL
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
        const baseUrl = apiBaseUrl.replace('/api/v1', '');
        const desktopUrl = result.variants.desktop.url.startsWith('http') 
          ? result.variants.desktop.url 
          : `${baseUrl}${result.variants.desktop.url}`;
        const mobileUrl = result.variants.mobile.url.startsWith('http')
          ? result.variants.mobile.url
          : `${baseUrl}${result.variants.mobile.url}`;
        
        onChange(desktopUrl, mobileUrl);
        setUploadError(null);
      } catch (error: any) {
        let errorMsg = 'Upload failed';
        
        if (error.message) {
          errorMsg = error.message;
        } else if (error.code === 'ECONNABORTED') {
          errorMsg = 'Upload timed out. Please check your connection and try again.';
        } else if (error.response?.status === 413) {
          errorMsg = 'Image is too large. Please reduce the file size and try again.';
        } else if (error.response?.status === 415) {
          errorMsg = 'Invalid file type. Please upload only image files.';
        } else if (!navigator.onLine) {
          errorMsg = 'Lost internet connection during upload. Please try again.';
        }
        
        setUploadError(errorMsg);
        onError?.(errorMsg);
        console.error('Upload error:', error);
      } finally {
        setUploading(false);
      }
    },
    [onChange, onError]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDelete = () => {
    setVariants(null);
    onChange('', '');
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>

      {uploadError && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="error">
            {uploadError}
          </Typography>
        </Box>
      )}

      {!value ? (
        <Paper
          variant="outlined"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            p: 3,
            textAlign: 'center',
            border: dragActive ? '2px dashed' : '2px dashed',
            borderColor: dragActive ? 'primary.main' : 'divider',
            bgcolor: dragActive ? 'action.hover' : 'background.paper',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <Box>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Uploading and optimizing...
              </Typography>
            </Box>
          ) : (
            <Box>
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                Drag and drop an image here
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                or
              </Typography>
              <Button
                variant="contained"
                component="label"
                disabled={disabled}
                startIcon={<UploadIcon />}
                sx={{ mt: 1 }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={disabled}
                />
              </Button>
              {helperText && (
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                  {helperText}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <img
                src={value}
                alt="Preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '100px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Image uploaded successfully
                </Typography>
                {variants && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {Object.keys(variants).length} variants generated
                  </Typography>
                )}
              </Box>
              <IconButton
                onClick={handleDelete}
                disabled={disabled}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>

            {variants && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1 }}>
                {Object.entries(variants).map(([name, variant]) => (
                  <Paper key={name} variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" fontWeight="bold" display="block">
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {variant.width}x{variant.height}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {(variant.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};
