/**
 * Optimized Switch Component
 * Prevents unnecessary re-renders for boolean toggles
 */

import { memo, useCallback } from 'react'
import { FormControlLabel, Switch, Typography } from '@mui/material'

interface OptimizedSwitchProps {
  label: string
  checked: boolean | undefined
  onChange: (checked: boolean) => void
  description?: string
}

export const OptimizedSwitch = memo<OptimizedSwitchProps>(({
  label,
  checked,
  onChange,
  description,
}) => {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked)
  }, [onChange])

  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={checked || false}
            onChange={handleChange}
          />
        }
        label={label}
      />
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
    </>
  )
})

OptimizedSwitch.displayName = 'OptimizedSwitch'