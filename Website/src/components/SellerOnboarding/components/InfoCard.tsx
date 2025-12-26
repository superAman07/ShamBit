import React from 'react';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface InfoCardProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  type = 'info',
  title,
  children,
  icon,
  className = ''
}) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          containerClass: 'bg-green-50 border-green-200',
          iconClass: 'text-green-600',
          titleClass: 'text-green-900',
          textClass: 'text-green-800',
          defaultIcon: CheckCircle
        };
      case 'warning':
        return {
          containerClass: 'bg-yellow-50 border-yellow-200',
          iconClass: 'text-yellow-600',
          titleClass: 'text-yellow-900',
          textClass: 'text-yellow-800',
          defaultIcon: AlertTriangle
        };
      case 'error':
        return {
          containerClass: 'bg-red-50 border-red-200',
          iconClass: 'text-red-600',
          titleClass: 'text-red-900',
          textClass: 'text-red-800',
          defaultIcon: XCircle
        };
      default:
        return {
          containerClass: 'bg-blue-50 border-blue-200',
          iconClass: 'text-blue-600',
          titleClass: 'text-blue-900',
          textClass: 'text-blue-800',
          defaultIcon: Info
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = icon || <config.defaultIcon className="w-5 h-5" />;

  return (
    <div className={`
      border rounded-lg p-4
      ${config.containerClass}
      ${className}
    `}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${config.iconClass}`}>
          {IconComponent}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-medium mb-1 ${config.titleClass}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.textClass}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;