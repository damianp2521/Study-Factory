-- 1. Ensure the column exists (safe to run even if you already added it)
ALTER TABLE staff_todos ADD COLUMN IF NOT EXISTS branch TEXT;

-- 2. Force Supabase API to refresh its cache and see the new column
NOTIFY pgrst, 'reload schema';
