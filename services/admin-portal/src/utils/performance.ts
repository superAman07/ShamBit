/**
 * Performance utilities - Simplified placeholder
 * Original complex performance monitoring was removed
 */

export const measurePerformance = (_name: string, fn: () => void) => {
  // Simple execution without performance monitoring
  fn();
};

export const trackComponentRender = (_componentName: string) => {
  // No-op - performance tracking removed
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
