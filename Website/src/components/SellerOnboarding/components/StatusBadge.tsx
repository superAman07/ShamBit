import React from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { ApplicationStatus, StepStatus } from '../types';

interface StatusBadgeProps {
  status: ApplicationStatus | StepStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
      case 'approved':
        return {
          label: status === 'completed' ? 'Completed' : 'Approved',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      
      case 'active':
      case 'incomplete':
        return {
          label: status === 'active' ? 'In Progress' : 'Incomplete',
          icon: Clock,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      
      case 'submitted':
        return {
          label: 'Under Review',
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      
      case 'clarification_needed':
        return {
          label: 'Action Required',
          icon: AlertTriangle,
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      
      case 'locked':
        return {
          label: 'Locked',
          icon: Info,
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
      
      default:
        return {
          label: 'Unknown',
          icon: Info,
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full border
      ${config.className}
      ${sizeClasses[size]}
      ${className}
    `}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
};

export default StatusBadge;