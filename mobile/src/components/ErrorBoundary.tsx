import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-brand-background min-h-[400px] rounded-2xl border border-brand-outline-variant/30 shadow-xs m-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-full mb-4 animate-bounce">
            <AlertTriangle size={32} />
          </div>
          <h2 className="font-display font-bold text-base text-brand-primary mb-2">
            Nimadir xato ketdi
          </h2>
          <p className="text-xs text-brand-text-variant max-w-xs mb-6 leading-relaxed">
            Suhbat yuklanishida kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-brand-primary text-white font-bold text-xs py-2.5 px-6 rounded-full cursor-pointer shadow-md hover:shadow-lg hover:opacity-95 transition-all"
          >
            <RotateCcw size={14} />
            <span>Qayta yuklash</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
