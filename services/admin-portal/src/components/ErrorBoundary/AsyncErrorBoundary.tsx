import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  onRetry?: () => Promise<void> | void;
  loading?: boolean;
  error?: Error | string | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isRetrying: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when error prop changes
    if (prevProps.error !== this.props.error) {
      if (this.props.error) {
        this.setState({
          hasError: true,
          error: typeof this.props.error === 'string' 
            ? new Error(this.props.error) 
            : this.props.error,
        });
      } else {
        this.setState({
          hasError: false,
          error: null,
        });
      }
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      if (this.props.onRetry) {
        await this.props.onRetry();
      }
      
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false,
      });
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error : new Error('Retry failed'),
        isRetrying: false,
      });
    }
  };

  render() {
    const { loading = false } = this.props;
    const { hasError, error, isRetrying } = this.state;
    
    // Show loading state
    if (loading || isRetrying) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    // Show error state
    if (hasError && error) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          <AlertTitle>Operation Failed</AlertTitle>
          {error.message || 'An unexpected error occurred during the operation.'}
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </Box>
        </Alert>
      );
    }

    return this.props.children;
  }
}