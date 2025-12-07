import React from 'react'
import { Card, CardContent, Typography } from '@mui/material'
import { SearchFilters, SearchAggregations } from '@/types/search'
import { FilterPreset } from './FilterPresets'

// Re-export types for other components
export type { SearchFilters, SearchAggregations }

interface Props {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  aggregations?: SearchAggregations
  loading?: boolean
  categories?: Array<{ id: string; name: string }>
  brands?: Array<{ id: string; name: string }>
  onSavePreset?: (name: string, description: string, filters: SearchFilters) => void
  presets?: FilterPreset[]
  onLoadPreset?: (preset: FilterPreset) => void
}

export const EnhancedProductSearch: React.FC<Props> = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Enhanced Product Search</Typography>
        <Typography variant="body2" color="text.secondary">
          Search functionality will be implemented here.
        </Typography>
      </CardContent>
    </Card>
  )
}