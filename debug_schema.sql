-- Inspect table definition
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vacation_requests';

-- Inspect policies
SELECT * FROM pg_policies WHERE table_name = 'vacation_requests';

-- Check if there is any foreign key constraint that might be failing (e.g. user_id)
