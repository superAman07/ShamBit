import React from 'react';
import { CheckCircle, Circle, Lock, AlertTriangle, XCircle } from 'lucide-react';
import type { StepperProps, OnboardingStep, StepStatus } from '../types';

const Stepper: React.FC<StepperProps> = ({
  currentStep,
  steps,
  stepStatuses,
  onStepClick,
  className = ''
}) => {
  const getStepIcon = (stepId: OnboardingStep, status: StepStatus, isActive: boolean) => {
    const iconClass = `w-5 h-5 ${isActive ? 'text-white' : ''}`;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className={`w-5 h-5 text-white`} />;
      case 'rejected':
        return <XCircle className={`w-5 h-5 text-white`} />;
      case 'clarification_needed':
        return <AlertTriangle className={`w-5 h-5 text-white`} />;
      case 'locked':
        return <Lock className={`w-5 h-5 text-gray-400`} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  const getStepStyles = (stepId: OnboardingStep, status: StepStatus, isActive: boolean) => {
    if (isActive) {
      return 'bg-[#FF6F61] border-[#FF6F61] text-white';
    }

    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 border-red-500 text-white';
      case 'clarification_needed':
        return 'bg-orange-500 border-orange-500 text-white';
      case 'locked':
        return 'bg-gray-100 border-gray-300 text-gray-400';
      default:
        return 'bg-white border-gray-300 text-gray-600 hover:border-gray-400';
    }
  };

  const getConnectorStyles = (index: number) => {
    if (index === steps.length - 1) return '';
    
    const currentStepStatus = stepStatuses[steps[index].id];
    const nextStepStatus = stepStatuses[steps[index + 1].id];
    
    if (currentStepStatus === 'completed') {
      return 'bg-green-500';
    } else if (currentStepStatus === 'active' || steps[index].id === currentStep) {
      return 'bg-[#FF6F61]';
    } else {
      return 'bg-gray-300';
    }
  };

  const canClickStep = (stepId: OnboardingStep, status: StepStatus) => {
    return status !== 'locked';
  };

  return (
    <div className={`w-full ${className}`}>
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = stepStatuses[step.id];
            const isActive = step.id === currentStep;
            const canClick = canClickStep(step.id, status);
            
            return (
              <li key={step.id} className="relative flex-1">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <button
                    onClick={() => canClick && onStepClick(step.id)}
                    disabled={!canClick}
                    className={`
                      relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                      ${getStepStyles(step.id, status, isActive)}
                      ${canClick ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                      focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2
                    `}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {getStepIcon(step.id, status, isActive)}
                  </button>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 ml-4">
                      <div className="h-0.5 bg-gray-300 relative">
                        <div 
                          className={`h-full transition-all duration-300 ${getConnectorStyles(index)}`}
                          style={{ 
                            width: status === 'completed' ? '100%' : 
                                   isActive ? '50%' : '0%' 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step Label */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-center min-w-max">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-[#FF6F61]' : 
                    status === 'completed' ? 'text-green-600' :
                    status === 'locked' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1 max-w-24">
                      {step.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default Stepper;