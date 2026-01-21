-- Create beverage_options table
CREATE TABLE IF NOT EXISTS beverage_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE beverage_options ENABLE ROW LEVEL SECURITY;

-- Policies for beverage_options (Allow read to authenticated, write to staff/admin)
CREATE POLICY "Enable read access for all authenticated users" ON beverage_options
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for staff and admin" ON beverage_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

CREATE POLICY "Enable delete for staff and admin" ON beverage_options
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

-- Create user_beverage_selections table
CREATE TABLE IF NOT EXISTS user_beverage_selections (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    selection_1 UUID REFERENCES beverage_options(id) ON DELETE SET NULL,
    selection_2 UUID REFERENCES beverage_options(id) ON DELETE SET NULL,
    selection_3 UUID REFERENCES beverage_options(id) ON DELETE SET NULL,
    selection_4 UUID REFERENCES beverage_options(id) ON DELETE SET NULL,
    selection_5 UUID REFERENCES beverage_options(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE user_beverage_selections ENABLE ROW LEVEL SECURITY;

-- Policies for user_beverage_selections (Read all, Upsert for Staff/Admin)
CREATE POLICY "Enable read access for all authenticated users" ON user_beverage_selections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable upsert for staff and admin" ON user_beverage_selections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

CREATE POLICY "Enable update for staff and admin" ON user_beverage_selections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

-- Insert initial beverage options
INSERT INTO beverage_options (name) VALUES
    ('선식'),
    ('아아'),
    ('텀아아'),
    ('텀뜨아')
ON CONFLICT (name) DO NOTHING;
