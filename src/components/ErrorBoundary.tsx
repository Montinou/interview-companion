'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI when an error occurs */
  fallback?: ReactNode;
  /** Component name for error logging */
  name?: string;
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for interview components.
 * Catches render errors and shows a recovery UI instead of crashing the whole page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive" className="flex flex-col items-center text-center gap-3">
          <div>
            <AlertTitle className="text-sm font-medium">
              {this.props.name ? `${this.props.name} encountered an error` : 'Something went wrong'}
            </AlertTitle>
            <AlertDescription className="text-xs max-w-sm mt-2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </div>
          <Button
            onClick={this.handleRetry}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Try again
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC wrapper for convenience:
 *   const SafeInsights = withErrorBoundary(InsightsTimeline, 'Insights')
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  name: string,
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithBoundary = (props: P) => (
    <ErrorBoundary name={name}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithBoundary;
}
