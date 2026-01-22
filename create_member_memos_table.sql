CREATE TABLE IF NOT EXISTS member_memos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES authorized_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('kst', now())
);

-- Enable RLS
ALTER TABLE member_memos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read/write for all (simplified for this app context)
CREATE POLICY "Enable read/write for all users" ON member_memos FOR ALL USING (true) WITH CHECK (true);
