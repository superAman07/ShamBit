import React from 'react';
import { Info, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { StatusBannerProps } from '../types';

const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  rejectionReason,
  clarificationRequests,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'incomplete':
        return {
          type: 'info',
          title: 'Complete Your Profile',
          message: 'Complete all sections to submit your seller application.',
          icon: <Info className="w-5 h-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      
      case 'submitted':
        return {
          type: 'info',
          title: 'Application Under Review',
          message: 'Your application is being reviewed. We\'ll notify you within 24-48 hours.',
          icon: <Clock className="w-5 h-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      
      case 'clarification_needed':
        return {
          type: 'warning',
          title: 'Action Required',
          message: 'Please provide additional information as requested below.',
          icon: <AlertTriangle className="w-5 h-5" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      
      case 'approved':
        return {
          type: 'success',
          title: 'Application Approved!',
          message: 'Congratulations! You can now start listing products and selling.',
          icon: <CheckCircle className="w-5 h-5" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      
      case 'rejected':
        return {
          type: 'error',
          title: 'Application Rejected',
          message: 'Please review the feedback below and resubmit your application.',
          icon: <XCircle className="w-5 h-5" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600'
        };
      
      default:
        return {
          type: 'info',
          title: 'Welcome to ShamBit Seller Portal',
          message: 'Complete your profile to start selling.',
          icon: <Info className="w-5 h-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`
      border rounded-lg p-4
      ${config.bgColor}
      ${config.borderColor}
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`text-sm mt-1 ${config.textColor}`}>
            {config.message}
          </p>

          {/* Rejection Reason */}
          {status === 'rejected' && rejectionReason && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                <strong>Reason:</strong> {rejectionReason}
              </p>
            </div>
          )}

          {/* Clarification Requests */}
          {status === 'clarification_needed' && clarificationRequests && clarificationRequests.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-yellow-800">
                Required Actions:
              </p>
              {clarificationRequests.map((request, index) => (
                <div key={index} className="p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    {request}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBanner;