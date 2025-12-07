import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          <AlertTitle>Component Error</AlertTitle>
          {this.props.componentName && (
            <>The {this.props.componentName} component encountered an error.</>
          )}
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={this.handleRetry}
            >
              Retry
            </Button>
          </Box>
        </Alert>
      );
    }

    return this.props.children;
  }
}