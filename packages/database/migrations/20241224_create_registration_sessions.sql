-- Create registration_sessions table for secure OTP-based registration
CREATE TABLE IF NOT EXISTS registration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    device_fingerprint TEXT,
    ip_address INET,
    risk_level VARCHAR(10) NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    risk_flags JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_sessions_mobile ON registration_sessions(mobile);
CREATE INDEX IF NOT EXISTS idx_registration_sessions_expires_at ON registration_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_registration_sessions_ip_address ON registration_sessions(ip_address);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_registration_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_registration_sessions_updated_at
    BEFORE UPDATE ON registration_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_registration_sessions_updated_at();

-- Add comment
COMMENT ON TABLE registration_sessions IS 'Temporary sessions for seller registration before OTP verification';