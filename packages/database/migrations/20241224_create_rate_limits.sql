-- Create rate_limits table for rate limiting functionality
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    identifier_type VARCHAR(50) NOT NULL DEFAULT 'mobile',
    action VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action ON rate_limits(action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, action, window_start);

-- Create unique constraint for rate limit windows
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_unique_window 
ON rate_limits(identifier, action, window_start);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rate_limits_updated_at
    BEFORE UPDATE ON rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_rate_limits_updated_at();

-- Add comment
COMMENT ON TABLE rate_limits IS 'Rate limiting records for various actions and identifiers';