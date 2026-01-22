CREATE TABLE IF NOT EXISTS attendance_memos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    branch TEXT NOT NULL DEFAULT '망미점',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('kst', now())
);

-- Enable RLS
ALTER TABLE attendance_memos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read/write for all (simplified for this app context)
CREATE POLICY "Enable read/write for all users" ON attendance_memos FOR ALL USING (true) WITH CHECK (true);
