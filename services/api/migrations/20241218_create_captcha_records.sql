-- Create captcha_records table for storing CAPTCHA data
CREATE TABLE IF NOT EXISTS captcha_records (
    id VARCHAR(255) PRIMARY KEY,
    text VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster cleanup of expired records
CREATE INDEX IF NOT EXISTS idx_captcha_expires_at ON captcha_records(expires_at);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_captcha_id ON captcha_records(id);