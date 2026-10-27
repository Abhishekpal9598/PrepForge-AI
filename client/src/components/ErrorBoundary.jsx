import React from 'react';
import { ErrorState } from './ErrorState';

/**
 * Global React Error Boundary for production crash protection.
 * Catches unhandled runtime render exceptions and displays a graceful fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary] Caught render exception:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080B14] flex items-center justify-center p-4">
          <ErrorState
            title="Application Error"
            message="An unexpected error occurred while rendering this view. Your session and data are safe."
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
