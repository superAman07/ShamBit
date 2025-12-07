# Error Boundary System

This directory contains a comprehensive error boundary system for the admin portal to prevent app crashes and provide graceful error handling.

## Components

### 1. ErrorBoundary
The main error boundary component with full customization options.

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary 
  level="page" // 'page' | 'component' | 'feature'
  showErrorDetails={process.env.NODE_ENV === 'development'}
  onError={(error, errorInfo) => {
    // Custom error handling
    console.error('Custom error handler:', error);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

### 2. ComponentErrorBoundary
Lightweight error boundary for individual components.

```tsx
import { ComponentErrorBoundary } from '@/components/ErrorBoundary';

<ComponentErrorBoundary componentName="User Profile">
  <UserProfile />
</ComponentErrorBoundary>
```

### 3. RouteErrorBoundary
Error boundary specifically designed for route-level error handling.

```tsx
import { RouteErrorBoundary } from '@/components/ErrorBoundary';

<RouteErrorBoundary>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</RouteErrorBoundary>
```

### 4. AsyncErrorBoundary
Handles errors from async operations and provides retry functionality.

```tsx
import { AsyncErrorBoundary } from '@/components/ErrorBoundary';

<AsyncErrorBoundary 
  loading={isLoading}
  error={error}
  onRetry={handleRetry}
>
  <DataComponent />
</AsyncErrorBoundary>
```

### 5. ErrorReportViewer
Development tool to view stored error reports.

```tsx
import { ErrorReportViewer } from '@/components/ErrorBoundary';

const [showErrors, setShowErrors] = useState(false);

<ErrorReportViewer 
  open={showErrors} 
  onClose={() => setShowErrors(false)} 
/>
```

## Higher-Order Component

Use `withErrorBoundary` to wrap components:

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent, {
  level: 'component',
  onError: (error, errorInfo) => {
    // Custom error handling
  }
});
```

## Hooks

### useAsyncError
For throwing errors in functional components:

```tsx
import { useAsyncError } from '@/components/ErrorBoundary';

const MyComponent = () => {
  const throwError = useAsyncError();
  
  const handleAsyncOperation = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      throwError(error);
    }
  };
};
```

### useErrorHandler
Custom hook for comprehensive error handling:

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

const MyComponent = () => {
  const { error, hasError, handleAsyncError, clearError } = useErrorHandler();
  
  const fetchData = () => {
    handleAsyncError(async () => {
      const data = await api.fetchData();
      return data;
    });
  };
};
```

## Error Reporting Service

The system includes an error reporting service that:

- Logs errors to console in development
- Sends errors to external service in production
- Stores errors locally for debugging
- Manages user context and session tracking

```tsx
import { errorReportingService } from '@/services/errorReportingService';

// Set user context
errorReportingService.setUserContext('user123', 'user@example.com');

// Manually report an error
errorReportingService.captureException(new Error('Something went wrong'));

// Report a message
errorReportingService.captureMessage('User performed action', 'info');
```

## Best Practices

### 1. Granular Error Boundaries
Place error boundaries at different levels:

```tsx
// App level
<ErrorBoundary level="page">
  <App />
</ErrorBoundary>

// Route level
<RouteErrorBoundary>
  <Routes>...</Routes>
</RouteErrorBoundary>

// Component level
<ComponentErrorBoundary componentName="Dashboard Widget">
  <DashboardWidget />
</ComponentErrorBoundary>
```

### 2. Async Error Handling
For components with async operations:

```tsx
<AsyncErrorBoundary 
  loading={loading}
  error={error}
  onRetry={() => dispatch(fetchData())}
>
  <DataTable data={data} />
</AsyncErrorBoundary>
```

### 3. Development vs Production
Show detailed errors in development, user-friendly messages in production:

```tsx
<ErrorBoundary 
  showErrorDetails={process.env.NODE_ENV === 'development'}
  level="component"
>
  <Component />
</ErrorBoundary>
```

### 4. Custom Error Handling
Implement custom error handling for specific needs:

```tsx
<ErrorBoundary 
  onError={(error, errorInfo) => {
    // Send to analytics
    analytics.track('component_error', {
      error: error.message,
      component: errorInfo.componentStack
    });
    
    // Show user notification
    toast.error('Something went wrong. Please try again.');
  }}
>
  <Component />
</ErrorBoundary>
```

## Environment Variables

Configure error reporting with environment variables:

```env
# Error reporting endpoint (production)
VITE_ERROR_REPORTING_ENDPOINT=https://api.example.com/errors

# Build version for error tracking
VITE_BUILD_VERSION=1.0.0
```

## Integration Examples

### Redux Integration
Handle Redux async thunk errors:

```tsx
const MyComponent = () => {
  const dispatch = useAppDispatch();
  const { error, loading } = useAppSelector(state => state.myFeature);
  
  return (
    <AsyncErrorBoundary 
      loading={loading}
      error={error}
      onRetry={() => dispatch(fetchMyData())}
    >
      <MyDataComponent />
    </AsyncErrorBoundary>
  );
};
```

### Form Error Handling
Handle form submission errors:

```tsx
const MyForm = () => {
  const { handleAsyncError } = useErrorHandler();
  
  const handleSubmit = (data) => {
    handleAsyncError(async () => {
      await api.submitForm(data);
      toast.success('Form submitted successfully!');
    }, (error) => {
      toast.error(`Submission failed: ${error.message}`);
    });
  };
};
```

This error boundary system provides comprehensive error handling that prevents app crashes while maintaining a good user experience and providing valuable debugging information for developers.