import React from 'react';
import AuthHeader from './AuthHeader';
import type { AuthCardProps } from '../types';

const AuthCard: React.FC<AuthCardProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Brand Header */}
      <AuthHeader />
      
      {/* Content */}
      <div className="p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
};

export default AuthCard;