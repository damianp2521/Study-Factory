-- Add linked_user_id column to pending_registrations
-- This allows us to keep the pending registration record even after the user signs up
-- The record will be hidden only when user fully completes preparation tasks (handled by frontend)

ALTER TABLE public.pending_registrations
ADD COLUMN linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
