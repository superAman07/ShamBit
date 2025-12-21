import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SellerForm } from './SellerForm';
import { LoginForm } from './LoginForm';
import { PasswordRecovery } from './PasswordRecovery';

type AuthMode = 'register' | 'login' | 'forgot_password';

interface AuthenticationFlowProps {
  onAuthSuccess: (data: {
    tokens: { accessToken: string; refreshToken: string };
    seller: any;
    isNewUser?: boolean;
  }) => void;
}

export const AuthenticationFlow: React.FC<AuthenticationFlowProps> = ({
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<AuthMode>('register');
  const [duplicateAccountInfo, setDuplicateAccountInfo] = useState<{
    identifier: string;
    type: 'email' | 'mobile';
  } | null>(null);

  const handleRegistrationError = (error: any) => {
    // Check if error indicates duplicate account
    if (error.code === 'DUPLICATE_ACCOUNT') {
      // Extract identifier from error message
      const message = error.message || '';
      let identifier = '';
      let type: 'email' | 'mobile' = 'email';
      
      if (message.includes('mobile')) {
        type = 'mobile';
        // Extract mobile from message if possible
        const mobileMatch = message.match(/\d{10}/);
        identifier = mobileMatch ? mobileMatch[0] : '';
      } else if (message.includes('email')) {
        type = 'email';
        // Extract email from message if possible
        const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
        identifier = emailMatch ? emailMatch[0] : '';
      }
      
      setDuplicateAccountInfo({ identifier, type });
      setMode('login');
    }
  };

  const handleLoginSuccess = (data: any) => {
    onAuthSuccess({
      ...data,
      isNewUser: false
    });
  };

  const handleRegistrationSuccess = (data: any) => {
    onAuthSuccess({
      ...data,
      isNewUser: true
    });
  };

  const handlePasswordRecoverySuccess = () => {
    setMode('login');
    setDuplicateAccountInfo(null);
  };

  const switchToLogin = () => {
    setMode('login');
    setDuplicateAccountInfo(null);
  };

  const switchToRegister = () => {
    setMode('register');
    setDuplicateAccountInfo(null);
  };

  const switchToForgotPassword = () => {
    setMode('forgot_password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {mode === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SellerForm 
                onRegistrationSuccess={handleRegistrationSuccess}
                onRegistrationError={handleRegistrationError}
                onSwitchToLogin={switchToLogin}
              />
            </motion.div>
          )}

          {mode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {duplicateAccountInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Account Already Exists
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          An account with this {duplicateAccountInfo.type} already exists. 
                          Please login instead or use account recovery if you forgot your password.
                        </p>
                        {duplicateAccountInfo.identifier && (
                          <p className="mt-1 font-medium">
                            {duplicateAccountInfo.type === 'email' ? 'Email: ' : 'Mobile: '}
                            {duplicateAccountInfo.identifier}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <LoginForm
                onLoginSuccess={handleLoginSuccess}
                onForgotPassword={switchToForgotPassword}
                onSwitchToRegister={switchToRegister}
              />
            </motion.div>
          )}

          {mode === 'forgot_password' && (
            <motion.div
              key="forgot_password"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PasswordRecovery
                onBackToLogin={() => setMode('login')}
                onRecoverySuccess={handlePasswordRecoverySuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};