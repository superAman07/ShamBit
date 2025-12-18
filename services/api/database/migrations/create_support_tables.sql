-- Migration to create support tables for OTP, CAPTCHA, and token management
-- Run this script after the main sellers table migration

-- Create OTP records table
CREATE TABLE IF NOT EXISTS otp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL, -- email or phone number
  otp VARCHAR(10) NOT NULL,
  purpose VARCHAR(100) NOT NULL, -- 'seller_login', 'password_reset', etc.
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite index for efficient lookups
  UNIQUE(identifier, purpose)
);

-- Create CAPTCHA records table
CREATE TABLE IF NOT EXISTS captcha_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captcha_id VARCHAR(255) UNIQUE NOT NULL,
  answer VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create blacklisted tokens table
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash of the token
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_otp_records_identifier_purpose ON otp_records(identifier, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_records_expires_at ON otp_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_captcha_records_captcha_id ON captcha_records(captcha_id);
CREATE INDEX IF NOT EXISTS idx_captcha_records_expires_at ON captcha_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_hash ON blacklisted_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_expires_at ON blacklisted_tokens(expires_at);

-- Add cleanup function for expired records
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS INTEGER AS $$
DECLARE
  total_cleaned INTEGER := 0;
  otp_cleaned INTEGER;
  captcha_cleaned INTEGER;
  token_cleaned INTEGER;
BEGIN
  -- Clean expired OTP records
  DELETE FROM otp_records WHERE expires_at < NOW();
  GET DIAGNOSTICS otp_cleaned = ROW_COUNT;
  
  -- Clean expired CAPTCHA records
  DELETE FROM captcha_records WHERE expires_at < NOW();
  GET DIAGNOSTICS captcha_cleaned = ROW_COUNT;
  
  -- Clean expired blacklisted tokens
  DELETE FROM blacklisted_tokens WHERE expires_at < NOW();
  GET DIAGNOSTICS token_cleaned = ROW_COUNT;
  
  total_cleaned := otp_cleaned + captcha_cleaned + token_cleaned;
  
  -- Log cleanup results
  INSERT INTO system_logs (level, message, data, created_at) 
  VALUES (
    'INFO', 
    'Expired records cleanup completed',
    json_build_object(
      'otp_cleaned', otp_cleaned,
      'captcha_cleaned', captcha_cleaned,
      'tokens_cleaned', token_cleaned,
      'total_cleaned', total_cleaned
    ),
    NOW()
  );
  
  RETURN total_cleaned;
END;
$$ LANGUAGE plpgsql;

-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL DEFAULT 'INFO',
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Uncomment the following line if you have pg_cron installed:
-- SELECT cron.schedule('cleanup-expired-records', '0 */6 * * *', 'SELECT cleanup_expired_records();');

-- Add constraints
ALTER TABLE otp_records ADD CONSTRAINT chk_otp_purpose 
  CHECK (purpose IN ('seller_login', 'password_reset', 'email_verification', 'phone_verification'));

ALTER TABLE otp_records ADD CONSTRAINT chk_otp_attempts 
  CHECK (attempts >= 0 AND attempts <= 10);

-- Add comments for documentation
COMMENT ON TABLE otp_records IS 'Stores OTP codes for various verification purposes';
COMMENT ON TABLE captcha_records IS 'Stores CAPTCHA challenges and answers';
COMMENT ON TABLE blacklisted_tokens IS 'Stores blacklisted JWT tokens for logout functionality';
COMMENT ON FUNCTION cleanup_expired_records() IS 'Cleans up expired OTP, CAPTCHA, and token records';