import React from 'react'
import { TextField, TextFieldProps } from '@mui/material'

interface OptimizedTextFieldProps extends Omit<TextFieldProps, 'onChange'> {
  value: string | number | undefined
  onChange: (value: string | number) => void
}

export const OptimizedTextField: React.FC<OptimizedTextFieldProps> = ({ value, onChange, ...props }) => {
  const [localValue, setLocalValue] = React.useState(String(value ?? ''))

  React.useEffect(() => {
    setLocalValue(String(value ?? ''))
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setLocalValue(newValue)
    const finalValue = props.type === 'number' ? parseFloat(newValue) || 0 : newValue
    onChange(finalValue)
  }

  return <TextField {...props} value={localValue} onChange={handleChange} />
}
