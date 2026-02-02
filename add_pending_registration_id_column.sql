-- Add pending_registration_id column to staff_todos
ALTER TABLE public.staff_todos
ADD COLUMN pending_registration_id uuid REFERENCES public.pending_registrations(id) ON DELETE CASCADE;
