-- Harden password_reset_tokens table for security
-- This migration adds token hashing and ensures one active token per seller

-- First, let's check the current structure and fix data type mismatches
DO $$
BEGIN
    -- Check if we need to alter the seller_id column type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' 
        AND column_name = 'seller_id' 
        AND data_type = 'integer'
    ) THEN
        -- Convert seller_id from integer to UUID to match sellers table
        ALTER TABLE password_reset_tokens ALTER COLUMN seller_id TYPE UUID USING seller_id::text::uuid;
    END IF;
END $$;

-- Add token_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' 
        AND column_name = 'token_hash'
    ) THEN
        ALTER TABLE password_reset_tokens ADD COLUMN token_hash VARCHAR(255);
    END IF;
END $$;

-- Migrate existing plaintext tokens to hashed tokens (if any exist)
-- Note: This is a one-time migration - existing tokens will be invalidated for security
UPDATE password_reset_tokens 
SET token_hash = '$2b$12$invalidated.for.security.migration.hash'
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Make token_hash NOT NULL after migration
ALTER TABLE password_reset_tokens ALTER COLUMN token_hash SET NOT NULL;

-- Drop the old plaintext token column for security
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' 
        AND column_name = 'token'
    ) THEN
        ALTER TABLE password_reset_tokens DROP COLUMN token;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'password_reset_tokens_seller_id_fkey'
    ) THEN
        ALTER TABLE password_reset_tokens 
        ADD CONSTRAINT password_reset_tokens_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure one active token per seller (drop existing constraint if it exists)
DO $$
BEGIN
    -- Drop existing constraints that might conflict
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'password_reset_tokens_seller_id_key'
    ) THEN
        ALTER TABLE password_reset_tokens DROP CONSTRAINT password_reset_tokens_seller_id_key;
    END IF;
    
    -- Add the proper constraint for one active token per seller
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'password_reset_tokens_one_active_per_seller'
    ) THEN
        -- Create partial unique index for active tokens only
        CREATE UNIQUE INDEX password_reset_tokens_one_active_per_seller 
        ON password_reset_tokens(seller_id) 
        WHERE used_at IS NULL AND expires_at > CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_seller_id ON password_reset_tokens(seller_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_password_reset_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_password_reset_tokens_updated_at ON password_reset_tokens;
CREATE TRIGGER update_password_reset_tokens_updated_at
    BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_password_reset_tokens_updated_at();

-- Add comments
COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens with hashing and one-per-seller constraint';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'Hashed reset token for security - never store plaintext tokens';
COMMENT ON INDEX password_reset_tokens_one_active_per_seller IS 'Ensures only one active reset token per seller at a time';