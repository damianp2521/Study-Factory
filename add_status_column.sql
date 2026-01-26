
-- Add status column to vacation_requests if it doesn't exist
ALTER TABLE public.vacation_requests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Optional: Set default to 'approved' for existing rows if any
UPDATE public.vacation_requests 
SET status = 'approved' 
WHERE status IS NULL OR status = 'pending'; 
-- (Assuming existing ones were implicitly approved or we want them to be)
