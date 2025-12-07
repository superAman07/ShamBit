import { useState, useCallback } from 'react';

interface ErrorState {
  error: Error | null;
  hasError: boolean;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    hasError: false,
  });

  const throwError = useCallback((error: Error) => {
    setErrorState(() => {
      throw error;
    });
  }, []);

  const handleError = useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setErrorState({
      error: errorObj,
      hasError: true,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      hasError: false,
    });
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      clearError();
      return await asyncFn();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      handleError(errorObj);
      if (onError) {
        onError(errorObj);
      }
      return null;
    }
  }, [handleError, clearError]);

  return {
    error: errorState.error,
    hasError: errorState.hasError,
    throwError,
    handleError,
    clearError,
    handleAsyncError,
  };
};