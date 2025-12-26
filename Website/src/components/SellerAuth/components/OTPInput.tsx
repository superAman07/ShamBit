import React, { useRef, useEffect, useCallback } from 'react';
import type { OTPInputProps } from '../types';

const OTPInput: React.FC<OTPInputProps & { onComplete?: (otp: string) => void }> = ({
  value,
  onChange,
  length = 6,
  error,
  disabled = false,
  autoFocus = false,
  onComplete
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Check if OTP is complete and call onComplete
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = useCallback(
    (index: number, inputValue: string) => {
      const digit = inputValue.replace(/\D/g, '').slice(-1);

      const chars = value.padEnd(length, '').split('');
      chars[index] = digit;

      const nextValue = chars.join('').replace(/\s+$/, ''); // Remove trailing spaces
      onChange(nextValue);

      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, length, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();

        const chars = value.padEnd(length, '').split('');

        if (chars[index]) {
          chars[index] = '';
          onChange(chars.join('').replace(/\s+$/, ''));
        } else if (index > 0) {
          chars[index - 1] = '';
          onChange(chars.join('').replace(/\s+$/, ''));
          inputRefs.current[index - 1]?.focus();
        }
      }

      if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, length, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      const pasted = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, length);

      onChange(pasted);

      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [length, onChange]
  );

  // Create display value for inputs
  const displayValue = value.padEnd(length, '');

  return (
    <div
      className="space-y-3"
      role="group"
      aria-label="One time password"
    >
      <div className="flex justify-center space-x-2">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={1}
            value={displayValue[index] || ''}
            disabled={disabled}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={!!error}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`
              w-12 h-12 text-center text-lg font-semibold
              text-gray-900
              border-2 rounded-lg
              transition-all duration-200
              focus:outline-none
              ${error
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:border-[#FF6F61] focus:ring-2 focus:ring-[#FF6F61]/20'
              }
              ${disabled
                ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                : 'hover:border-gray-400'
              }
            `}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-sm text-center flex items-center justify-center">
          <svg
            className="w-4 h-4 mr-1 flex-shrink-0"
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

export default OTPInput;