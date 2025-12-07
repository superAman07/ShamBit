/**
 * Date Utilities
 * Centralized date manipulation functions
 */

import { DateRange } from '@/types/dashboard';

/**
 * Get date range for today
 */
export const getTodayRange = (): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    startDate: today.toISOString(),
    endDate: now.toISOString(),
  };
};

/**
 * Get date range for last N days
 * @param days Number of days to go back
 */
export const getLastNDaysRange = (days: number): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
};

/**
 * Get date range for last N months
 * @param months Number of months to go back
 */
export const getLastNMonthsRange = (months: number): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setMonth(start.getMonth() - months);
  
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
};

/**
 * Create custom date range
 * @param startDate Start date string (YYYY-MM-DD)
 * @param endDate End date string (YYYY-MM-DD)
 */
export const createCustomRange = (startDate: string, endDate: string): DateRange => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // End of day
  
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
};

/**
 * Format date and time for display
 * @param dateString ISO date string
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date only for display
 * @param dateString ISO date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
