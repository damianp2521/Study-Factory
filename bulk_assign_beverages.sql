
-- Bulk Assign Beverages based on User Request
-- Logic: 
-- 1. Create a CTE with the raw (name, beverage_name) pairs.
-- 2. Aggregate beverages per user.
-- 3. Look up IDs.
-- 4. Upsert into user_beverage_selections.

DO $$
DECLARE
    v_seonsik_id UUID;
    v_ah_ah_id UUID;
    v_tum_ah_ah_id UUID;
BEGIN
    -- 1. Get Beverage IDs
    SELECT id INTO v_seonsik_id FROM beverage_options WHERE name = '선식';
    SELECT id INTO v_ah_ah_id FROM beverage_options WHERE name = '아아';
    SELECT id INTO v_tum_ah_ah_id FROM beverage_options WHERE name = '텀아아';

    -- Raise notice if any ID is missing
    IF v_seonsik_id IS NULL OR v_ah_ah_id IS NULL OR v_tum_ah_ah_id IS NULL THEN
        RAISE EXCEPTION 'One or more beverage options not found. Ensure "선식", "아아", "텀아아" exist in beverage_options.';
    END IF;

    -- 2. Create Temp Table for Raw Data
    CREATE TEMP TABLE temp_beverage_assignments (
        user_name TEXT,
        beverage_id UUID
    ) ON COMMIT DROP;

    -- 3. Insert Raw Data
    -- List 1: 선식
    INSERT INTO temp_beverage_assignments (user_name, beverage_id) VALUES
    ('김민서2', v_seonsik_id), ('서지은', v_seonsik_id), ('채성화', v_seonsik_id), ('전지윤', v_seonsik_id), 
    ('김경민', v_seonsik_id), ('김현빈', v_seonsik_id), ('신승훈', v_seonsik_id), ('전우진', v_seonsik_id), 
    ('김영서', v_seonsik_id), ('김채현', v_seonsik_id), ('한유주', v_seonsik_id), ('박수민', v_seonsik_id), 
    ('엄승환', v_seonsik_id), ('강흥원', v_seonsik_id), ('남태우', v_seonsik_id), ('김원규', v_seonsik_id), 
    ('임석희', v_seonsik_id), ('김민준', v_seonsik_id), ('정경민', v_seonsik_id), ('김기태', v_seonsik_id), 
    ('김보해', v_seonsik_id), ('이다원', v_seonsik_id), ('성시영', v_seonsik_id), ('박선주', v_seonsik_id), 
    ('남지정', v_seonsik_id), ('김송이', v_seonsik_id), ('장혜지', v_seonsik_id), ('이두현', v_seonsik_id), 
    ('김보라', v_seonsik_id), ('황성재', v_seonsik_id), ('심규환', v_seonsik_id), ('최영', v_seonsik_id), 
    ('이가은', v_seonsik_id), ('김경섭', v_seonsik_id), ('송민영', v_seonsik_id), ('김다윗', v_seonsik_id), 
    ('김규리', v_seonsik_id), ('이수빈', v_seonsik_id), ('김은빈', v_seonsik_id), ('김예나', v_seonsik_id);

    -- List 2: 아아
    INSERT INTO temp_beverage_assignments (user_name, beverage_id) VALUES
    ('김민서1', v_ah_ah_id), ('정승한', v_ah_ah_id), ('심규환', v_ah_ah_id), ('민병철', v_ah_ah_id), 
    ('김현빈', v_ah_ah_id), ('김은빈', v_ah_ah_id), ('남태우', v_ah_ah_id), ('정민주', v_ah_ah_id), 
    ('김민서2', v_ah_ah_id), ('이종우', v_ah_ah_id), ('하재우', v_ah_ah_id), ('이주원', v_ah_ah_id), 
    ('전우진', v_ah_ah_id), ('황성재', v_ah_ah_id), ('박선주', v_ah_ah_id), ('한주연', v_ah_ah_id), 
    ('김단비', v_ah_ah_id), ('김경섭', v_ah_ah_id), ('성시영', v_ah_ah_id), ('김다윗', v_ah_ah_id), 
    ('이수빈', v_ah_ah_id);

    -- List 3: 텀아아
    INSERT INTO temp_beverage_assignments (user_name, beverage_id) VALUES
    ('이다원', v_tum_ah_ah_id), ('김보해', v_tum_ah_ah_id), ('윤성하', v_tum_ah_ah_id), ('이수빈', v_tum_ah_ah_id), 
    ('이예성', v_tum_ah_ah_id), ('박수민', v_tum_ah_ah_id), ('남지정', v_tum_ah_ah_id);

    -- 4. Process and Upsert
    -- We join with profiles to get user_id.
    -- Warning: If '김민서2' is not exact match in DB, this will fail for that user.
    -- We assume names match exactly as in 'profiles.name'.
    
    WITH aggregated_selections AS (
        SELECT 
            p.id as user_id,
            array_agg(t.beverage_id) as bevs
        FROM temp_beverage_assignments t
        JOIN profiles p ON p.name = t.user_name
        GROUP BY p.id
    )
    INSERT INTO user_beverage_selections (user_id, selection_1, selection_2, selection_3, selection_4, selection_5)
    SELECT 
        user_id,
        bevs[1] as selection_1,
        bevs[2] as selection_2,
        bevs[3] as selection_3,
        bevs[4] as selection_4,
        bevs[5] as selection_5
    FROM aggregated_selections
    ON CONFLICT (user_id) DO UPDATE SET
        selection_1 = EXCLUDED.selection_1,
        selection_2 = EXCLUDED.selection_2,
        selection_3 = EXCLUDED.selection_3,
        selection_4 = EXCLUDED.selection_4,
        selection_5 = EXCLUDED.selection_5,
        updated_at = NOW();

END $$;
