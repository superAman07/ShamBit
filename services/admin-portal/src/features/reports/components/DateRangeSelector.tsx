import React, { useState } from 'react';
import { Box, Button, ButtonGroup, TextField, Alert } from '@mui/material';
import { ReportPeriod } from '@/types/reports';

interface DateRangeSelectorProps {
  currentPeriod: ReportPeriod;
  startDate: string;
  endDate: string;
  onPeriodChange: (period: ReportPeriod) => void;
  onCustomDateRangeChange: (startDate: string, endDate: string) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  currentPeriod,
  startDate,
  endDate,
  onPeriodChange,
  onCustomDateRangeChange,
}) => {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [dateError, setDateError] = useState<string | null>(null);

  const periods: { value: ReportPeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
  ];

  const handlePeriodClick = (period: ReportPeriod) => {
    setDateError(null);
    onPeriodChange(period);
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = event.target.value;
    setLocalStartDate(newStartDate);
    
    // Validate date range
    if (newStartDate && localEndDate && newStartDate > localEndDate) {
      setDateError('Start date must be before or equal to end date');
      return;
    }
    
    setDateError(null);
    if (newStartDate && localEndDate) {
      onCustomDateRangeChange(newStartDate, localEndDate);
    }
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = event.target.value;
    setLocalEndDate(newEndDate);
    
    // Validate date range
    if (localStartDate && newEndDate && localStartDate > newEndDate) {
      setDateError('End date must be after or equal to start date');
      return;
    }
    
    setDateError(null);
    if (localStartDate && newEndDate) {
      onCustomDateRangeChange(localStartDate, newEndDate);
    }
  };

  // Update local state when props change
  React.useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ButtonGroup variant="outlined" size="small">
          {periods.map((period) => (
            <Button
              key={period.value}
              onClick={() => handlePeriodClick(period.value)}
              variant={currentPeriod === period.value ? 'contained' : 'outlined'}
            >
              {period.label}
            </Button>
          ))}
        </ButtonGroup>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={localStartDate}
            onChange={handleStartDateChange}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={localEndDate}
            onChange={handleEndDateChange}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
        </Box>
      </Box>

      {dateError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {dateError}
        </Alert>
      )}
    </Box>
  );
};
