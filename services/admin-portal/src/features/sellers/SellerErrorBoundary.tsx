import React, { Component, ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Refresh as RefreshIcon, Warning as WarningIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

class SellerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Seller page error:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <WarningIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            
            <Typography variant="h5" gutterBottom>
              Seller Data Loading Error
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              There was an issue loading the seller data. This might be due to data format changes or network issues.
            </Typography>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <AlertTitle>Possible Solutions:</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Run the database migration script to update seller data format</li>
                <li>Check if the API server is running and accessible</li>
                <li>Verify that seller data exists in the database</li>
                <li>Check browser console for detailed error information</li>
              </ul>
            </Alert>

            {this.state.error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <AlertTitle>Error Details:</AlertTitle>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.message}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              If this error persists, please contact the development team.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default SellerErrorBoundary;