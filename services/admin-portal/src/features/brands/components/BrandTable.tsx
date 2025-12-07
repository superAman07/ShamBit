import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Box,
  Avatar,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Language as WebsiteIcon,
} from '@mui/icons-material'
import { Brand } from '@/types/brand'

interface BrandTableProps {
  brands: Brand[]
  loading: boolean
  error: string | null
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string, currentStatus: boolean) => void
}

export function BrandTable({
  brands,
  loading,
  error,
  onEdit,
  onDelete,
  onToggleStatus
}: BrandTableProps) {
  return (
    <TableContainer sx={{ maxHeight: '70vh', overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Brand</TableCell>
            <TableCell>Country</TableCell>
            <TableCell>Website</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body1">Loading brands...</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
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
          ) : brands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body1">No brands found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Try adjusting your search filters or add some brands.
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => (
              <TableRow key={brand.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      src={brand.logoUrl ? `http://${window.location.hostname}:3000${brand.logoUrl}` : undefined}
                      alt={brand.name}
                      sx={{ width: 40, height: 40 }}
                    >
                      {brand.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {brand.name}
                      </Typography>
                      {brand.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {brand.description.length > 50 
                            ? `${brand.description.substring(0, 50)}...` 
                            : brand.description}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  {brand.country ? (
                    <Chip label={brand.country} size="small" variant="outlined" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {brand.website ? (
                    <Tooltip title={brand.website}>
                      <IconButton
                        size="small"
                        onClick={() => window.open(brand.website, '_blank')}
                      >
                        <WebsiteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={brand.isActive ? 'Active' : 'Inactive'}
                    color={brand.isActive ? 'success' : 'default'}
                    size="small"
                    icon={brand.isActive ? <ActiveIcon /> : <InactiveIcon />}
                    onClick={() => onToggleStatus(brand.id, brand.isActive)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(brand.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(brand.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={brand.name === 'Generic Brand' ? 'Cannot delete default brand' : 'Delete'}>
                      <span>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => onDelete(brand.id)}
                          disabled={brand.name === 'Generic Brand'}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}