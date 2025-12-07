import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DateRange as DateRangeIcon } from '@mui/icons-material';
import { DateRange } from '@/types/dashboard';
import { getTodayRange, getLastNDaysRange, createCustomRange } from '@/utils/dateUtils';
import { DASHBOARD_CONFIG } from '@/config/dashboard.config';

interface DateRangeSelectorProps {
  onDateRangeChange: (dateRange: DateRange | null) => void;
  currentRange: DateRange | null;
}

type QuickRange = 'today' | 'week' | 'month' | 'custom';

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  onDateRangeChange,
}) => {
  const [selectedRange, setSelectedRange] = useState<QuickRange>('today');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getDateRange = (range: QuickRange): DateRange | null => {
    switch (range) {
      case 'today':
        return getTodayRange();
      case 'week':
        return getLastNDaysRange(DASHBOARD_CONFIG.DATE_RANGES.WEEK);
      case 'month':
        return getLastNDaysRange(DASHBOARD_CONFIG.DATE_RANGES.MONTH);
      case 'custom':
        return null;
      default:
        return null;
    }
  };

  const handleQuickRangeClick = (range: QuickRange) => {
    setSelectedRange(range);
    if (range === 'custom') {
      setCustomDialogOpen(true);
    } else {
      const dateRange = getDateRange(range);
      onDateRangeChange(dateRange);
    }
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      const dateRange = createCustomRange(customStartDate, customEndDate);
      onDateRangeChange(dateRange);
      setCustomDialogOpen(false);
    }
  };

  const handleCustomRangeCancel = () => {
    setCustomDialogOpen(false);
    setSelectedRange('today');
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <ButtonGroup variant="outlined" size="small">
          <Button
            variant={selectedRange === 'today' ? 'contained' : 'outlined'}
            onClick={() => handleQuickRangeClick('today')}
          >
            Today
          </Button>
          <Button
            variant={selectedRange === 'week' ? 'contained' : 'outlined'}
            onClick={() => handleQuickRangeClick('week')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={selectedRange === 'month' ? 'contained' : 'outlined'}
            onClick={() => handleQuickRangeClick('month')}
          >
            Last 30 Days
          </Button>
          <Button
            variant={selectedRange === 'custom' ? 'contained' : 'outlined'}
            onClick={() => handleQuickRangeClick('custom')}
            startIcon={<DateRangeIcon />}
          >
            Custom
          </Button>
        </ButtonGroup>
      </Box>

      <Dialog open={customDialogOpen} onClose={handleCustomRangeCancel}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, minWidth: 300 }}>
            <TextField
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: customStartDate,
              }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCustomRangeCancel}>Cancel</Button>
          <Button
            onClick={handleCustomRangeApply}
            variant="contained"
            disabled={!customStartDate || !customEndDate}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
