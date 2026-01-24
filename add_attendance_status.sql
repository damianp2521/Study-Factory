-- Add status column to attendance_logs table for special attendance statuses
-- Status values: 지각, 병원, 외출, 쉼, 운동, 알바, 스터디, 집공, 개인

ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;

-- Add update policy for status changes
CREATE POLICY "Staff/Admin can update attendance" ON public.attendance_logs
    FOR UPDATE USING (auth.role() = 'authenticated');
