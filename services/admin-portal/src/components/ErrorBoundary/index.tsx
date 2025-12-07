import React from 'react';

export { ErrorBoundary } from './ErrorBoundary';
export { ComponentErrorBoundary } from './ComponentErrorBoundary';
export { RouteErrorBoundary } from './RouteErrorBoundary';
export { AsyncErrorBoundary } from './AsyncErrorBoundary';

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: {
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    level?: 'page' | 'component' | 'feature';
  }
) => {
  const { ErrorBoundary: ErrorBoundaryComponent } = require('./ErrorBoundary');
  
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryComponent {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryComponent>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for handling async errors in functional components
export const useAsyncError = () => {
  const [, setError] = React.useState();
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};