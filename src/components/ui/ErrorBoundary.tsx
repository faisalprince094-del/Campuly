import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CampuslyLogo } from './CampuslyLogo';
import { RefreshCw, AlertTriangle, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Campusly Uncaught Application Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      // Clear non-essential cached session keys that might be corrupt
      localStorage.removeItem('campusly_active_timer');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.href = '/';
  };

  private handleFullReset = () => {
    if (window.confirm('Reset local application cache? Your account credentials remain saved on the server.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#05070A] text-slate-800 dark:text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#0B1017] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-[#1E293B] shadow-xl text-center">
            <div className="flex justify-center mb-4">
              <CampuslyLogo size="lg" showText={true} />
            </div>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
              Something went wrong
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Campusly encountered an unexpected display issue. Your saved data is secure. Try reloading or recovering below.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                id="error-boundary-reload-btn"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 active:scale-98 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                id="error-boundary-reset-btn"
                onClick={this.handleResetAndReload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#101823] hover:bg-slate-200 dark:hover:bg-[#16202E] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-[#1E293B] transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard Home</span>
              </button>

              <button
                id="error-boundary-clear-btn"
                onClick={this.handleFullReset}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache & Reset</span>
              </button>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-6 text-left border-t border-slate-200 dark:border-[#1E293B] pt-4">
                <summary className="text-[11px] font-mono text-slate-400 cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 text-rose-300 text-[10px] rounded-lg overflow-x-auto font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
