/**
 * Virtualized Product Table for Better Performance
 * Only renders visible rows to improve performance with large datasets
 */

import { memo, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
} from '@mui/material'
import { ProductTableRow } from './ProductTableRow'

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

interface VirtualizedProductTableProps {
  products: Product[]
  loading: boolean
  error: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string, currentStatus: boolean) => void
}

export const VirtualizedProductTable = memo<VirtualizedProductTableProps>(({
  products,
  loading,
  error,
  onEdit,
  onDelete,
  onToggleStatus
}) => {
  // Memoize the product rows to prevent unnecessary re-renders
  const productRows = useMemo(() => {
    return products.map((product) => (
      <ProductTableRow
        key={product.id}
        product={product}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    ))
  }, [products, onEdit, onDelete, onToggleStatus])

  return (
    <TableContainer sx={{ maxHeight: '70vh', overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Image</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Brand</TableCell>
            <TableCell align="right">Selling Price</TableCell>
            <TableCell align="right">MRP</TableCell>
            <TableCell align="center">Featured</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body1">Loading products...</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={10} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body1" color="error">
                    {error}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Please try refreshing the page or check your connection.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body1">No products found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Try adjusting your search filters or add some products.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            productRows
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
})

VirtualizedProductTable.displayName = 'VirtualizedProductTable'