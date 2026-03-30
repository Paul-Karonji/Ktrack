import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { clearAccessToken } from '../../services/api';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        clearAccessToken();
        sessionStorage.clear();
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-2">
                            The application encountered an error. This usually happens due to cached data.
                        </p>
                        {this.state.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
                                <p className="text-red-700 text-xs font-mono font-bold">{this.state.error.name}</p>
                                <p className="text-red-600 text-xs font-mono mt-1 break-words">{this.state.error.message}</p>
                            </div>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Clear Cache &amp; Reload
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
