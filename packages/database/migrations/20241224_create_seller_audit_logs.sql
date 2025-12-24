-- Create seller_audit_logs table for audit logging
CREATE TABLE IF NOT EXISTS seller_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_audit_logs_seller_id ON seller_audit_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_audit_logs_action ON seller_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_seller_audit_logs_entity_type ON seller_audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_seller_audit_logs_performed_at ON seller_audit_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_seller_audit_logs_ip_address ON seller_audit_logs(ip_address);

-- Add foreign key constraint (nullable for system actions)
ALTER TABLE seller_audit_logs 
ADD CONSTRAINT seller_audit_logs_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON TABLE seller_audit_logs IS 'Audit log for seller-related actions and changes';