-- 신음료 신청 전용 테이블 (기존 음료 데이터와 분리)
CREATE TABLE IF NOT EXISTS new_beverage_requests (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    beverage_1_choice TEXT NOT NULL CHECK (beverage_1_choice IN ('선식', '해독주스', '안먹음')),
    beverage_2_choice TEXT NOT NULL CHECK (beverage_2_choice IN ('아아', '기타', '안먹음')),
    beverage_2_custom TEXT,
    use_personal_tumbler BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT new_beverage_custom_check CHECK (
        (beverage_2_choice = '기타' AND beverage_2_custom IS NOT NULL AND length(trim(beverage_2_custom)) > 0)
        OR (beverage_2_choice <> '기타' AND beverage_2_custom IS NULL)
    )
);

CREATE OR REPLACE FUNCTION set_new_beverage_requests_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_beverage_requests_updated_at ON new_beverage_requests;
CREATE TRIGGER trg_new_beverage_requests_updated_at
BEFORE UPDATE ON new_beverage_requests
FOR EACH ROW
EXECUTE FUNCTION set_new_beverage_requests_updated_at();

ALTER TABLE new_beverage_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own new beverage request" ON new_beverage_requests;
CREATE POLICY "Members can read own new beverage request" ON new_beverage_requests
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
    );

DROP POLICY IF EXISTS "Members can insert own new beverage request" ON new_beverage_requests;
CREATE POLICY "Members can insert own new beverage request" ON new_beverage_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members can update own new beverage request" ON new_beverage_requests;
CREATE POLICY "Members can update own new beverage request" ON new_beverage_requests
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
