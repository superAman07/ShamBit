import React from 'react';
import type { FormFieldProps } from '../types';

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  icon,
  autoComplete,
  inputMode,
  maxLength,
  className = ''
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Format input based on type
    if (type === 'tel') {
      newValue = newValue.replace(/\D/g, '').slice(0, 10);
    } else if (type === 'email') {
      newValue = newValue.toLowerCase().trim();
    }
    
    onChange(newValue);
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
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          className={`
            w-full px-4 py-3 border rounded-lg transition-all duration-200
            focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${icon ? 'pl-11' : ''}
            ${error 
              ? 'border-red-300 bg-red-50 focus:ring-red-200' 
              : 'border-gray-300 hover:border-gray-400 focus:border-[#FF6F61]'
            }
          `}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      </div>

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

export default FormField;