-- Add branch column to staff_todos table
ALTER TABLE staff_todos ADD COLUMN branch TEXT;

-- Optional: You may want to update existing rows to default to the creator's current branch, 
-- but since that changes, leaving them NULL (and falling back to current user branch in UI) is safer for now.
