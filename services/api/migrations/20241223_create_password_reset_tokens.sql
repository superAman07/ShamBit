-- Create password reset tokens table for secure password reset functionality
-- This table stores temporary tokens for password reset requests

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    identifier VARCHAR(255) NOT NULL, -- email or mobile used for reset
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one active token per seller
    UNIQUE(seller_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_seller_id ON password_reset_tokens(seller_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Clean up expired tokens (optional, can be run periodically)
-- DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;