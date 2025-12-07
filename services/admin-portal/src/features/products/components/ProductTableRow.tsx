/**
 * Optimized Product Table Row Component
 * Memoized to prevent unnecessary re-renders
 */

import { memo, useCallback } from 'react'
import {
  TableRow,
  TableCell,
  Typography,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Box,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material'
import { formatCurrency } from '@/utils/formatters'
import { getImageUrl, getPlaceholderImage } from '@/utils/image'

interface Product {
  id: string
  name: string
  sku?: string
  barcode?: string
  category?: { name: string }
  brand?: string
  brandInfo?: { name: string }
  sellingPrice: number
  price?: number
  mrp: number
  finalPrice?: number
  isFeatured: boolean
  isActive: boolean
  imageUrls?: string[]
}

interface ProductTableRowProps {
  product: Product
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string, currentStatus: boolean) => void
}

export const ProductTableRow = memo<ProductTableRowProps>(({ 
  product, 
  onEdit, 
  onDelete, 
  onToggleStatus 
}) => {
  const handleEdit = useCallback(() => {
    onEdit(product.id)
  }, [onEdit, product.id])

  const handleDelete = useCallback(() => {
    onDelete(product.id)
  }, [onDelete, product.id])

  const handleToggleStatus = useCallback(() => {
    onToggleStatus(product.id, product.isActive)
  }, [onToggleStatus, product.id, product.isActive])

  return (
    <TableRow hover>
      <TableCell>
        {product.imageUrls && product.imageUrls[0] ? (
          <Box
            component="img"
            src={getImageUrl(product.imageUrls[0])}
            alt={product.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getPlaceholderImage(50, 50)
            }}
            sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
          />
        ) : (
          <Box
            sx={{
              width: 50,
              height: 50,
              bgcolor: 'grey.200',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              No Image
            </Typography>
          </Box>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight="medium">
          {product.name}
        </Typography>
        {product.barcode && (
          <Typography variant="caption" color="text.secondary" display="block">
            Barcode: {product.barcode}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {product.sku || '-'}
        </Typography>
      </TableCell>
      <TableCell>{product.category?.name || '-'}</TableCell>
      <TableCell>{product.brand || product.brandInfo?.name || '-'}</TableCell>
      <TableCell align="right">
        {formatCurrency(product.sellingPrice || product.price || 0)}
        {product.finalPrice && product.finalPrice !== product.sellingPrice && (
          <Typography variant="caption" color="success.main" display="block">
            Final: {formatCurrency(product.finalPrice)}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">{formatCurrency(product.mrp)}</TableCell>
      <TableCell align="center">
        <Chip
          label={product.isFeatured ? 'Featured' : 'Regular'}
          color={product.isFeatured ? 'primary' : 'default'}
          size="small"
          variant={product.isFeatured ? 'filled' : 'outlined'}
        />
      </TableCell>
      <TableCell align="center">
        <Chip
          label={product.isActive ? 'Active' : 'Inactive'}
          color={product.isActive ? 'success' : 'default'}
          size="small"
          icon={product.isActive ? <ActiveIcon /> : <InactiveIcon />}
          onClick={handleToggleStatus}
          sx={{ cursor: 'pointer' }}
        />
      </TableCell>
      <TableCell align="center">
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={handleDelete}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  )
})

ProductTableRow.displayName = 'ProductTableRow'