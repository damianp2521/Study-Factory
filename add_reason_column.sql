-- Add reason column to vacation_requests table if it doesn't exist
ALTER TABLE vacation_requests
ADD COLUMN IF NOT EXISTS reason text;

-- Optional: Comment on column
COMMENT ON COLUMN vacation_requests.reason IS 'Reason for the leave request (e.g. Alba, Study, Hospital)';
