import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mb-2 text-gray-400">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="mt-6 rounded-full bg-[#1DB954] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1ed760]"
            >
              Go back to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
