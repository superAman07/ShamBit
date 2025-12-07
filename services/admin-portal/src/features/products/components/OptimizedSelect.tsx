/**
 * Optimized Select Component
 * Prevents unnecessary re-renders for dropdown selections
 */

import { memo, useCallback } from 'react'
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material'

interface Option {
  value: string | number
  label: string
}

interface OptimizedSelectProps {
  label: string
  value: string | number | undefined
  options: Option[]
  onChange: (value: string | number) => void
  error?: boolean
  helperText?: string
  required?: boolean
  fullWidth?: boolean
}

export const OptimizedSelect = memo<OptimizedSelectProps>(({
  label,
  value,
  options,
  onChange,
  error = false,
  required = false,
  fullWidth = true,
}) => {
  const handleChange = useCallback((event: SelectChangeEvent) => {
    const selectedValue = event.target.value
    // Find the original option to get the correct type
    const option = options.find(opt => String(opt.value) === selectedValue)
    if (option) {
      onChange(option.value) // Pass the original value (number or string)
    } else {
      onChange(selectedValue) // Fallback to string value
    }
  }, [onChange, options])

  return (
    <FormControl fullWidth={fullWidth} error={error} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={String(value ?? '')}
        label={label}
        onChange={handleChange}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={String(option.value)}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
})

OptimizedSelect.displayName = 'OptimizedSelect'