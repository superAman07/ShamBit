import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  level?: 'page' | 'component' | 'feature';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console (simplified - no external error reporting)
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component', showErrorDetails = false } = this.props;
      const { error, errorInfo } = this.state;

      return (
        <Box
          sx={{
            p: level === 'page' ? 4 : 2,
            minHeight: level === 'page' ? '50vh' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={level === 'page' ? 3 : 1}
            sx={{
              p: 3,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BugIcon />
                  Something went wrong
                </Box>
              </AlertTitle>
              {level === 'page'
                ? 'An unexpected error occurred while loading this page.'
                : 'An error occurred in this component.'}
            </Alert>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {level === 'page'
                ? 'We apologize for the inconvenience. Please try refreshing the page or return to the home page.'
                : 'This component encountered an error. You can try to reload it or continue using other parts of the application.'}
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              {level === 'page' && (
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
              )}
            </Stack>

            {showErrorDetails && error && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography variant="body2" component="pre">
                      {error.message}
                      {errorInfo && (
                        <>
                          {'\n\nComponent Stack:'}
                          {errorInfo.componentStack}
                        </>
                      )}
                    </Typography>
                  </Paper>
                </Box>
              </>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;