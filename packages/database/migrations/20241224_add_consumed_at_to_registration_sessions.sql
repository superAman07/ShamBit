-- Add consumed_at column to prevent race conditions in registration sessions
-- This ensures each session can only be consumed once atomically

ALTER TABLE registration_sessions 
ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance on consumed_at queries
CREATE INDEX IF NOT EXISTS idx_registration_sessions_consumed_at 
ON registration_sessions(consumed_at);

-- Create partial index for active (unconsumed) sessions
CREATE INDEX IF NOT EXISTS idx_registration_sessions_active 
ON registration_sessions(id) 
WHERE consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP;

-- Add comment
COMMENT ON COLUMN registration_sessions.consumed_at IS 'Timestamp when session was consumed to prevent race conditions and duplicate account creation';