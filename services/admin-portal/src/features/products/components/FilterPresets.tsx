/**
 * Filter Presets Component
 * Manage saved filter presets for quick access to common searches
 */

import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Menu,
  MenuItem,

  Alert,
} from '@mui/material'
import {
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkedIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Star as StarIcon,
} from '@mui/icons-material'
import { SearchFilters } from '@/types/search'
import { AdvancedFilterCriteria } from './AdvancedFilters'

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: SearchFilters | AdvancedFilterCriteria
  isDefault?: boolean
  isShared?: boolean
  createdBy?: string
  createdAt: Date
  lastUsed?: Date
  usageCount?: number
  tags?: string[]
}

interface Props {
  presets: FilterPreset[]
  onLoadPreset: (preset: FilterPreset) => void
  onSavePreset: (name: string, description: string, filters: any) => void
  onUpdatePreset: (id: string, name: string, description: string) => void
  onDeletePreset: (id: string) => void
  onSetDefault: (id: string) => void
  onSharePreset?: (id: string) => void
  currentFilters?: SearchFilters | AdvancedFilterCriteria
}

const COMMON_PRESETS: Omit<FilterPreset, 'id' | 'createdAt'>[] = [
  {
    name: 'Low Stock Alert',
    description: 'Products with low stock levels that need restocking',
    filters: { stockLevel: 'Low', isActive: true },
    tags: ['inventory', 'urgent'],
  },
  {
    name: 'Featured Products',
    description: 'All featured products for homepage management',
    filters: { isFeatured: true, isActive: true },
    tags: ['marketing', 'featured'],
  },
  {
    name: 'Products Without Images',
    description: 'Products missing images that need content updates',
    filters: { hasImages: false, isActive: true },
    tags: ['content', 'incomplete'],
  },
  {
    name: 'High-Value Products',
    description: 'Products with selling price above ₹1000',
    filters: { minPrice: 1000, isActive: true },
    tags: ['pricing', 'premium'],
  },
  {
    name: 'Recently Added',
    description: 'Products added in the last 7 days',
    filters: {
      dateRange: {
        field: 'created_at' as const,
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      isActive: true,
    },
    tags: ['recent', 'new'],
  },
  {
    name: 'Inactive Products',
    description: 'Products that are currently inactive',
    filters: { isActive: false },
    tags: ['status', 'inactive'],
  },
]

export const FilterPresets: React.FC<Props> = ({
  presets,
  onLoadPreset,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
  onSetDefault,
  onSharePreset,
  currentFilters,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, preset: FilterPreset) => {
    setMenuAnchor(event.currentTarget)
    setSelectedPreset(preset)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedPreset(null)
  }

  const handleCreatePreset = () => {
    if (presetName.trim() && currentFilters) {
      onSavePreset(presetName.trim(), presetDescription.trim(), currentFilters)
      setCreateDialogOpen(false)
      setPresetName('')
      setPresetDescription('')
    }
  }

  const handleEditPreset = () => {
    if (editingPreset && presetName.trim()) {
      onUpdatePreset(editingPreset.id, presetName.trim(), presetDescription.trim())
      setEditDialogOpen(false)
      setEditingPreset(null)
      setPresetName('')
      setPresetDescription('')
    }
  }

  const openEditDialog = (preset: FilterPreset) => {
    setEditingPreset(preset)
    setPresetName(preset.name)
    setPresetDescription(preset.description || '')
    setEditDialogOpen(true)
    handleMenuClose()
  }

  const handleDeletePreset = (preset: FilterPreset) => {
    onDeletePreset(preset.id)
    handleMenuClose()
  }

  const handleSetDefault = (preset: FilterPreset) => {
    onSetDefault(preset.id)
    handleMenuClose()
  }

  const handleSharePreset = (preset: FilterPreset) => {
    if (onSharePreset) {
      onSharePreset(preset.id)
    }
    handleMenuClose()
  }

  const getFilterSummary = (filters: any): string => {
    const parts: string[] = []
    
    if (filters.query) parts.push(`Search: "${filters.query}"`)
    if (filters.categoryId) parts.push('Category filter')
    if (filters.brandId) parts.push('Brand filter')
    if (filters.isActive !== undefined) parts.push(`Status: ${filters.isActive ? 'Active' : 'Inactive'}`)
    if (filters.isFeatured !== undefined) parts.push(`Featured: ${filters.isFeatured ? 'Yes' : 'No'}`)
    if (filters.stockLevel) parts.push(`Stock: ${filters.stockLevel}`)
    if (filters.minPrice || filters.maxPrice) parts.push('Price range')
    if (filters.dateRange) parts.push('Date range')
    
    return parts.length > 0 ? parts.slice(0, 3).join(', ') + (parts.length > 3 ? '...' : '') : 'No filters'
  }

  const formatLastUsed = (date?: Date): string => {
    if (!date) return 'Never used'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  // Combine user presets with common presets
  const allPresets = [
    ...presets,
    ...COMMON_PRESETS.map((preset, index) => ({
      ...preset,
      id: `common_${index}`,
      createdAt: new Date(),
      isDefault: false,
    }))
  ]

  // Sort presets: default first, then by usage count, then by last used
  const sortedPresets = [...allPresets].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    if ((a.usageCount || 0) !== (b.usageCount || 0)) {
      return (b.usageCount || 0) - (a.usageCount || 0)
    }
    if (a.lastUsed && b.lastUsed) {
      return b.lastUsed.getTime() - a.lastUsed.getTime()
    }
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return (
    <>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <BookmarkIcon />
              <Typography variant="h6">Filter Presets</Typography>
            </Stack>
          }
          action={
            <Button
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={!currentFilters}
            >
              Save Current
            </Button>
          }
        />
        <CardContent>
          {sortedPresets.length === 0 ? (
            <Alert severity="info">
              No saved presets. Create your first preset by applying filters and clicking "Save Current".
            </Alert>
          ) : (
            <List>
              {sortedPresets.map((preset, index) => (
                <ListItem
                  key={preset.id}
                  divider={index < sortedPresets.length - 1}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    ...(preset.isDefault && { bgcolor: 'primary.50' }),
                  }}
                  onClick={() => onLoadPreset(preset)}
                >
                  <ListItemIcon>
                    {preset.isDefault ? (
                      <StarIcon color="primary" />
                    ) : preset.isShared ? (
                      <ShareIcon color="action" />
                    ) : (
                      <BookmarkedIcon color="action" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="subtitle2">{preset.name}</Typography>
                        {preset.isDefault && (
                          <Chip label="Default" size="small" color="primary" />
                        )}
                        {preset.isShared && (
                          <Chip label="Shared" size="small" color="secondary" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {preset.description || getFilterSummary(preset.filters)}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          {preset.tags?.map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatLastUsed(preset.lastUsed)}
                          {preset.usageCount && ` • Used ${preset.usageCount} times`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuOpen(e, preset)
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedPreset && !selectedPreset.isDefault && (
          <MenuItem onClick={() => handleSetDefault(selectedPreset)}>
            <StarIcon sx={{ mr: 1 }} />
            Set as Default
          </MenuItem>
        )}
        <MenuItem onClick={() => selectedPreset && openEditDialog(selectedPreset)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {onSharePreset && (
          <MenuItem onClick={() => selectedPreset && handleSharePreset(selectedPreset)}>
            <ShareIcon sx={{ mr: 1 }} />
            Share
          </MenuItem>
        )}
        <MenuItem
          onClick={() => selectedPreset && handleDeletePreset(selectedPreset)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Preset Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Preset Name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description (Optional)"
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            {currentFilters && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Current Filters:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getFilterSummary(currentFilters)}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePreset} variant="contained" disabled={!presetName.trim()}>
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Preset Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Filter Preset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Preset Name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description (Optional)"
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditPreset} variant="contained" disabled={!presetName.trim()}>
            Update Preset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}