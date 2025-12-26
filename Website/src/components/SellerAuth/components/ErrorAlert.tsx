import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { ErrorAlertProps } from '../types';

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  suggestion,
  onDismiss,
  className = ''
}) => {
  if (!error) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-red-800 text-sm font-medium">
            {error}
          </p>
          {suggestion && (
            <p className="text-red-700 text-xs mt-1">
              {suggestion}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;