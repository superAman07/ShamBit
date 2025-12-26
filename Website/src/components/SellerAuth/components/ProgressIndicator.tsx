import React from 'react';

interface ProgressStep {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  steps, 
  className = '' 
}) => {
  return (
    <div className={`px-4 py-3 bg-gray-50 border-b border-gray-100 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                ${step.completed 
                  ? 'bg-green-500 text-white' 
                  : step.active 
                    ? 'bg-[#FF6F61] text-white' 
                    : 'bg-gray-200 text-gray-500'
                }
              `}>
                {step.completed ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`
                ml-2 text-xs font-medium
                ${step.active ? 'text-[#FF6F61]' : step.completed ? 'text-green-600' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3 h-0.5 bg-gray-200 relative">
                <div 
                  className={`
                    h-full transition-all duration-300
                    ${step.completed ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;