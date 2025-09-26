import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-red-300 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Что-то пошло не так 😔</h1>
          <p className="max-w-xl text-sm text-red-200/80">
            {this.state.error.message || 'Неизвестная ошибка. Проверьте консоль браузера для подробностей.'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
