-- Verify customer management schema

-- Check users table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('verification_status', 'is_blocked', 'last_login_at')
ORDER BY column_name;

-- Check users table indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' 
  AND indexname IN ('users_verification_status_index', 'users_is_blocked_index')
ORDER BY indexname;

-- Check users table constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname = 'check_verification_status';

-- Check customer_notes table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_notes'
ORDER BY ordinal_position;

-- Check customer_notes indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customer_notes'
ORDER BY indexname;

-- Check customer_notes constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'customer_notes'::regclass
  AND conname = 'check_note_text_length';

-- Check customer_activity_log table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customer_activity_log'
ORDER BY ordinal_position;

-- Check customer_activity_log indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'customer_activity_log'
ORDER BY indexname;
