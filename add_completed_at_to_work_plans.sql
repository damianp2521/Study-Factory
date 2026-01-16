-- Add completed_at column to work_plans table
ALTER TABLE work_plans 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
