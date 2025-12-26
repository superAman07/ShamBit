import React, { useState } from 'react';
import type { FormFieldProps } from '../types';

/* ---------------- Password helpers ---------------- */

const getPasswordChecks = (value: string) => ({
  length: value.length >= 8,
  lowercase: /[a-z]/.test(value),
  uppercase: /[A-Z]/.test(value),
  number: /[0-9]/.test(value),
  special: /[^A-Za-z0-9]/.test(value),
});

const getStrength = (checks: ReturnType<typeof getPasswordChecks>) => {
  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
  if (score === 2) return { label: 'Fair', color: 'bg-yellow-400', width: '50%' };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500', width: '75%' };
  return { label: 'Strong', color: 'bg-green-600', width: '100%' };
};

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
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    if (type === 'tel') {
      val = val.replace(/\D/g, '').slice(0, 10);
    } else if (type === 'email') {
      val = val.toLowerCase().trim();
    }

    onChange(val);
  };

  const passwordChecks = isPassword ? getPasswordChecks(value) : null;
  const strength = passwordChecks ? getStrength(passwordChecks) : null;

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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800">
            {icon}
          </div>
        )}

        <input
          id={name}
          name={name}
          type={isPassword && showPassword ? 'text' : type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={isPassword ? 'new-password' : autoComplete}
          inputMode={
            inputMode ??
            (type === 'tel'
              ? 'numeric'
              : type === 'email'
              ? 'email'
              : 'text')
          }
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="next"
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`
            w-full px-4 py-3 border rounded-lg transition-all duration-200

            bg-white
            text-black
            caret-black
            font-medium

            placeholder:text-gray-500
            placeholder:opacity-100

            focus:ring-2 focus:ring-[#FF6F61]
            focus:border-transparent

            disabled:bg-gray-50
            disabled:text-gray-500
            disabled:cursor-not-allowed

            ${icon ? 'pl-11' : ''}
            ${isPassword ? 'pr-12' : ''}

            ${
              error
                ? 'border-red-300 bg-red-50 text-black focus:ring-red-200'
                : 'border-gray-300 hover:border-gray-400 focus:border-[#FF6F61]'
            }
          `}
        />

        {/* Show / Hide password */}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>

      {/* Strength bar */}
      {isPassword && value && strength && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-gray-200 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${strength.color}`}
              style={{ width: strength.width }}
            />
          </div>
          <p className="text-xs text-gray-600">
            Password strength:{' '}
            <span className="font-medium">{strength.label}</span>
          </p>
        </div>
      )}

      {/* Password rules */}
      {isPassword && (
        <div className="text-sm space-y-1">
          <p className="font-medium text-gray-700">Password requirements:</p>

          <ul className="space-y-1">
            <li className={passwordChecks?.length ? 'text-green-600' : 'text-gray-400'}>
              ● At least 8 characters
            </li>
            <li className={passwordChecks?.lowercase ? 'text-green-600' : 'text-gray-400'}>
              ● One lowercase letter
            </li>
            <li className={passwordChecks?.uppercase ? 'text-green-600' : 'text-gray-400'}>
              ● One uppercase letter
            </li>
            <li className={passwordChecks?.number ? 'text-green-600' : 'text-gray-400'}>
              ● One number
            </li>
            <li className={passwordChecks?.special ? 'text-green-600' : 'text-gray-400'}>
              ● One special character
            </li>
          </ul>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          id={`${name}-error`}
          className="text-red-600 text-sm flex items-start"
        >
          <svg
            className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
