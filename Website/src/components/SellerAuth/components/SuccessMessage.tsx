import React from 'react';
import { CheckCircle } from 'lucide-react';
import LoadingButton from './LoadingButton';
import type { SuccessMessageProps } from '../types';

const SuccessMessage: React.FC<SuccessMessageProps> = ({
  title,
  message,
  actions = [],
  className = ''
}) => {
  return (
    <div className={`text-center ${className}`}>
      {/* Success Icon */}
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">
        {title}
      </h2>

      {/* Message */}
      <p className="text-gray-600 text-sm mb-6">
        {message}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <LoadingButton
              key={index}
              onClick={action.onClick}
              variant={action.variant || (index === 0 ? 'primary' : 'secondary')}
              className="w-full"
            >
              {action.label}
            </LoadingButton>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuccessMessage;