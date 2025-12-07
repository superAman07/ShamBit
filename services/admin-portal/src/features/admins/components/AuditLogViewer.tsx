import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Chip,
  Typography,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { fetchAuditLogs } from '@/store/slices/adminSlice'
import { formatDate } from '@/utils/dateUtils'

interface AuditLogViewerProps {
  open: boolean
  onClose: () => void
}

export const AuditLogViewer = ({ open, onClose }: AuditLogViewerProps) => {
  const dispatch = useAppDispatch()
  const { auditLogs, auditLogsPagination, loading } = useAppSelector((state) => state.admin)
  const { admins } = useAppSelector((state) => state.admin)

  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    adminId: '',
  })

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      dispatch(fetchAuditLogs({
        limit: 100,
        offset: 0,
      }))
    }
  }, [open, dispatch])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleApplyFilters = () => {
    const params: any = {
      limit: 100,
      offset: 0,
    }

    if (filters.action) params.action = filters.action
    if (filters.resourceType) params.resourceType = filters.resourceType
    if (filters.adminId) params.adminId = filters.adminId

    dispatch(fetchAuditLogs(params))
  }

  const handleClearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      adminId: '',
    })
    dispatch(fetchAuditLogs({
      limit: 100,
      offset: 0,
    }))
  }

  const toggleRowExpansion = (logId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const getAdminName = (adminId: string) => {
    const admin = admins.find(a => a.id === adminId)
    return admin ? admin.name : adminId
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Admin Audit Logs</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Action"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Resource Type"
            value={filters.resourceType}
            onChange={(e) => handleFilterChange('resourceType', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <Button variant="contained" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="outlined" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {auditLogs.length} of {auditLogsPagination.total} logs
        </Typography>

        <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Resource Type</TableCell>
                <TableCell>Resource ID</TableCell>
                <TableCell>IP Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log) => (
                  <>
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(log.id)}
                        >
                          {expandedRows.has(log.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{getAdminName(log.adminId)}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" />
                      </TableCell>
                      <TableCell>{log.resourceType}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {log.resourceId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0, borderBottom: expandedRows.has(log.id) ? undefined : 0 }}>
                        <Collapse in={expandedRows.has(log.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Details:
                            </Typography>
                            <Typography variant="body2" component="div">
                              <strong>Full Resource ID:</strong> {log.resourceId}
                            </Typography>
                            {log.userAgent && (
                              <Typography variant="body2" component="div">
                                <strong>User Agent:</strong> {log.userAgent}
                              </Typography>
                            )}
                            {log.changes && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" component="div">
                                  <strong>Changes:</strong>
                                </Typography>
                                <Paper sx={{ p: 1, mt: 0.5, bgcolor: 'grey.100' }}>
                                  <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto' }}>
                                    {JSON.stringify(log.changes, null, 2)}
                                  </pre>
                                </Paper>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
