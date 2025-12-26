import { useState, useEffect, useCallback } from 'react';

interface UseOTPTimerOptions {
  initialTime?: number;
  onExpire?: () => void;
}

interface UseOTPTimerReturn {
  timeRemaining: number;
  isActive: boolean;
  isExpired: boolean;
  start: (duration?: number) => void;
  stop: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
}

export const useOTPTimer = ({ 
  initialTime = 300, // 5 minutes default
  onExpire 
}: UseOTPTimerOptions = {}): UseOTPTimerReturn => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setIsActive(false);
            if (onExpire) {
              onExpire();
            }
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else if (!isActive && interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeRemaining, onExpire]);

  const start = useCallback((duration?: number) => {
    if (duration) {
      setTimeRemaining(duration);
    }
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback(() => {
    setTimeRemaining(initialTime);
    setIsActive(false);
  }, [initialTime]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    timeRemaining,
    isActive,
    isExpired: timeRemaining === 0,
    start,
    stop,
    reset,
    formatTime
  };
};