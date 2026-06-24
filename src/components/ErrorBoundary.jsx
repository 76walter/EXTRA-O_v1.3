import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-black/20 border border-red-500/30 rounded-2xl backdrop-blur-md animate-fade-in">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Ops! Algo deu errado aqui.</h2>
          <p className="text-gray-400 text-center max-w-md mb-6">
            Não se preocupe, o resto do sistema continua funcionando. Tivemos um problema apenas nesta seção.
          </p>
          <div className="bg-black/40 p-4 rounded-lg w-full max-w-md overflow-hidden mb-6 border border-white/5">
            <p className="text-red-400 text-sm font-mono truncate">
              {this.state.error?.toString()}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const withErrorBoundary = (WrappedComponent) => {
  return (props) => (
    <ErrorBoundary>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
};
