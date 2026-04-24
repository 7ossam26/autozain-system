import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center" dir="rtl">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-warning" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">حصل مشكلة</h2>
          <p className="text-text-secondary text-sm mb-6 max-w-sm">
            حصل خطأ غير متوقع في هذه الصفحة. حاول تاني أو تواصل مع الدعم الفني.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm hover:bg-primary-dark transition-colors"
          >
            <RefreshCw size={16} />
            حاول تاني
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
