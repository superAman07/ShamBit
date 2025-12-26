import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import type { PasswordFieldProps, PasswordStrength } from '../types';

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  showStrength = false,
  requirements = false,
  autoComplete,
  className = ''
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const getPasswordStrength = (password: string): { strength: PasswordStrength; score: number } => {
    if (!password) return { strength: 'weak', score: 0 };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[@$!%*?&]/.test(password)) score += 20;
    
    let strength: PasswordStrength = 'weak';
    if (score >= 80) strength = 'strong';
    else if (score >= 60) strength = 'good';
    else if (score >= 40) strength = 'fair';
    
    return { strength, score };
  };

  const getPasswordRequirements = (password: string) => [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /\d/.test(password), text: 'One number' },
    { met: /[@$!%*?&]/.test(password), text: 'One special character (@$!%*?&)' }
  ];

  const { strength, score } = getPasswordStrength(value);
  const passwordRequirements = getPasswordRequirements(value);

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-yellow-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500'
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input */}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            w-full pl-11 pr-12 py-3 border rounded-lg transition-all duration-200
            focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-red-300 bg-red-50 focus:ring-red-200' 
              : 'border-gray-300 hover:border-gray-400 focus:border-[#FF6F61]'
            }
          `}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Password Strength Indicator */}
      {showStrength && value && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Password strength:</span>
            <span className={`text-xs font-medium ${
              strength === 'strong' ? 'text-green-600' :
              strength === 'good' ? 'text-blue-600' :
              strength === 'fair' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {strengthLabels[strength]}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${strengthColors[strength]}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      )}

      {/* Password Requirements */}
      {requirements && value && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Password requirements:</h4>
          <div className="space-y-1">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center text-xs">
                <div className={`w-2 h-2 rounded-full mr-2 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p id={`${name}-error`} className="text-red-600 text-sm flex items-start">
          <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordField;