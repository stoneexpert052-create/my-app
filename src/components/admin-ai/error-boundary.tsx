'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminAiErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface AdminAiErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AdminAiErrorBoundary extends React.Component<
  AdminAiErrorBoundaryProps,
  AdminAiErrorBoundaryState
> {
  constructor(props: AdminAiErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): AdminAiErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected error in Admin AI module.',
    };
  }

  componentDidCatch(error: Error) {
    console.warn('[AdminAiErrorBoundary]', error?.message || error);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl border border-amber-500/35 bg-slate-950 text-white p-6 text-center space-y-3"
          dir="rtl"
        >
          <div className="mx-auto h-11 w-11 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-extrabold text-amber-300">
            {this.props.fallbackTitle || 'ایڈمن AI اسسٹنٹ عارضی طور پر رک گیا'}
          </h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {this.state.errorMessage}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={this.handleReset}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>دوبارہ شروع کریں (Reload AI)</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
