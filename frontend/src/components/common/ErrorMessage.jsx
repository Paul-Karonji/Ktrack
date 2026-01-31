import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ error }) => {
    if (!error) return null;

    return (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
            </div>
        </div>
    );
};

export default ErrorMessage;
