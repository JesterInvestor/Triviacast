"use client";

import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export default class ClientErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console and / or remote logging
    console.error('ClientErrorBoundary caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="max-w-xl bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-bold text-red-600">An unexpected error occurred</h2>
            <p className="mt-2 text-sm text-neutral-700">{String(this.state.error?.message || 'Unknown error')}</p>
            <pre className="mt-4 text-xs text-neutral-500 break-words">{String(this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
