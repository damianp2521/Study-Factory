-- 1. Create fixed_leave_requests table
CREATE TABLE IF NOT EXISTS fixed_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    periods INTEGER[] NOT NULL,   -- Array of period numbers e.g. {1, 2, 3}
    reason TEXT NOT NULL,         -- e.g. '알바', '교회'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE fixed_leave_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Managers (staff/admin) can do everything
CREATE POLICY "Enable all access for staff and admin" ON fixed_leave_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

-- 4. Function to generate attendance logs from fixed requests
-- Can be called via RPC: supabase.rpc('generate_fixed_leaves', { target_start_date: '...', target_end_date: '...' })
CREATE OR REPLACE FUNCTION generate_fixed_leaves(target_start_date DATE, target_end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    curr_date DATE;
    dow INTEGER;
    req RECORD;
    p INTEGER;
    inserted_count INTEGER := 0;
BEGIN
    -- Iterate through each day in the range
    curr_date := target_start_date;
    WHILE curr_date <= target_end_date LOOP
        -- Get Day of Week (postgres dow: 0=Sun, 6=Sat)
        dow := EXTRACT(DOW FROM curr_date);

        -- Find matching fixed requests
        FOR req IN 
            SELECT * FROM fixed_leave_requests WHERE day_of_week = dow
        LOOP
            -- For each period in the array
            FOREACH p IN ARRAY req.periods
            LOOP
                -- Upsert into attendance_logs
                INSERT INTO attendance_logs (user_id, date, period, status)
                VALUES (req.user_id, curr_date, p, req.reason)
                ON CONFLICT (user_id, date, period) 
                DO UPDATE SET status = req.reason;
                
                inserted_count := inserted_count + 1;
            END LOOP;
        END LOOP;

        curr_date := curr_date + 1;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
