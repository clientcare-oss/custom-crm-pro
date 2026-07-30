import React, { Component, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  moduleName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScopedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ScopedErrorBoundary] Error in module "${this.props.moduleName || "unknown"}":`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-slate-100 shadow-lg my-4 max-w-xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base text-rose-200">
                {this.props.moduleName ? `Failed to load ${this.props.moduleName}` : "Something went wrong in this section"}
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                An unexpected error occurred while rendering this module. You can try refreshing the section.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2 rounded bg-black/40 border border-rose-500/20 font-mono text-[11px] text-rose-300/90 truncate">
                  {this.state.error.message}
                </div>
              )}
              <button
                onClick={this.handleReset}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ScopedErrorBoundary;
