import { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  children: ReactNode;
}

// Hook-based wrapper for navigation
const RouteErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <ErrorBoundary
      level="page"
      showErrorDetails={process.env.NODE_ENV === 'development'}
      fallback={
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Page Error</h2>
          <p>An error occurred while loading the page: {location.pathname}</p>
          <div style={{ marginTop: '1rem', gap: '1rem', display: 'flex', justifyContent: 'center' }}>
            <button onClick={retry}>Try Again</button>
            <button onClick={handleGoBack}>Go Back</button>
            <button onClick={handleGoHome}>Go Home</button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '1rem', textAlign: 'left' }}>
              <summary>Error Details</summary>
              <pre style={{ background: '#f5f5f5', padding: '1rem', overflow: 'auto' }}>
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      }
    >
      {null}
    </ErrorBoundary>
  );
};

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <RouteErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}