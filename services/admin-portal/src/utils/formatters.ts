/**
 * Formatting Utilities
 * Centralized formatting functions for consistent display
 */

/**
 * Format currency amount
 * @param amount Amount (can be in rupees or paise based on context)
 * @param locale Locale for formatting (default: 'en-IN')
 * @param currency Currency symbol (default: '₹')
 * @param fromPaise Whether amount is in paise (default: false)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  locale: string = 'en-IN',
  currency: string = '₹',
  fromPaise: boolean = false
): string => {
  if (amount === undefined || amount === null) return '-';
  
  const value = fromPaise ? amount / 100 : amount;
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency}${formatted}`;
};

/**
 * Format date to localized string
 * @param date Date object, string, or undefined
 * @param locale Locale for formatting (default: 'en-IN')
 * @param options Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | undefined,
  locale: string = 'en-IN',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return dateObj.toLocaleDateString(locale, options || defaultOptions);
};

/**
 * Format date and time to localized string
 * @param date Date object, string, or undefined
 * @param locale Locale for formatting (default: 'en-IN')
 * @param options Formatting options
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | undefined,
  locale: string = 'en-IN',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return dateObj.toLocaleString(locale, options || defaultOptions);
};

/**
 * Format number with locale-specific separators
 * @param value Number to format
 * @param locale Locale for formatting (default: 'en-IN')
 * @returns Formatted number string
 */
export const formatNumber = (value: number, locale: string = 'en-IN'): string => {
  return value.toLocaleString(locale);
};

/**
 * Capitalize first letter of each word
 * @param text Text to capitalize
 * @returns Capitalized text
 */
export const capitalizeWords = (text: string): string => {
  return text
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Capitalize first letter of string
 * @param text Text to capitalize
 * @returns Capitalized text
 */
export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Format percentage value
 * @param value Percentage value (e.g., 15.5 for 15.5%)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(decimals)}%`;
};
