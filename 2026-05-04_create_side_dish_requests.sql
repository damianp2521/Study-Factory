-- 반찬 신청 (오전/오후) 저장 테이블
CREATE TABLE IF NOT EXISTS side_dish_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_date DATE NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('am', 'pm')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_completed BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, request_date, period)
);

CREATE OR REPLACE FUNCTION set_side_dish_requests_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_side_dish_requests_updated_at ON side_dish_requests;
CREATE TRIGGER trg_side_dish_requests_updated_at
BEFORE UPDATE ON side_dish_requests
FOR EACH ROW
EXECUTE FUNCTION set_side_dish_requests_updated_at();

ALTER TABLE side_dish_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own side dish request or staff/admin" ON side_dish_requests;
CREATE POLICY "Read own side dish request or staff/admin" ON side_dish_requests
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

DROP POLICY IF EXISTS "Insert own side dish request" ON side_dish_requests;
CREATE POLICY "Insert own side dish request" ON side_dish_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own side dish request" ON side_dish_requests;
CREATE POLICY "Update own side dish request" ON side_dish_requests
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
